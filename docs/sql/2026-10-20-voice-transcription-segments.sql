begin;


create table if not exists
public.voice_transcription_segments (
    id uuid
        primary key
        default gen_random_uuid(),

    recording_id uuid
        not null
        references public.communication_recordings(id)
        on delete cascade,

    segment_index integer
        not null,

    start_ms bigint
        not null,

    end_ms bigint
        not null,

    transcript_text text
        not null,

    created_at timestamptz
        not null
        default now(),

    constraint
        voice_transcription_segments_index_nonnegative_ck
        check (
            segment_index >= 0
        ),

    constraint
        voice_transcription_segments_start_nonnegative_ck
        check (
            start_ms >= 0
        ),

    constraint
        voice_transcription_segments_time_order_ck
        check (
            end_ms >= start_ms
        ),

    constraint
        voice_transcription_segments_text_nonblank_ck
        check (
            btrim(transcript_text) <> ''
        )
);


create unique index if not exists
    voice_transcription_segments_recording_segment_uidx
on public.voice_transcription_segments (
    recording_id,
    segment_index
);


create index if not exists
    voice_transcription_segments_recording_time_idx
on public.voice_transcription_segments (
    recording_id,
    start_ms,
    end_ms
);


alter table
    public.voice_transcription_segments
enable row level security;


drop policy if exists
    voice_transcription_segments_member_select
on public.voice_transcription_segments;

create policy
    voice_transcription_segments_member_select
on public.voice_transcription_segments
for select
to authenticated
using (
    exists (
        select 1
        from public.communication_recordings as cr
        where cr.id =
            voice_transcription_segments.recording_id
          and public.is_facility_member(
                cr.facility_id
          )
    )
);


revoke all
on table
    public.voice_transcription_segments
from public;

revoke all
on table
    public.voice_transcription_segments
from anon;

revoke insert, update, delete
on table
    public.voice_transcription_segments
from authenticated;

grant select
on table
    public.voice_transcription_segments
to authenticated;


create or replace function
public.persist_voice_transcription_segments(
    p_facility_id uuid,
    p_recording_id uuid,
    p_segments jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_existing_count integer;
    v_input_count integer;
    v_mismatch_count integer;
begin
    if (
        auth.jwt()
          -> 'app_metadata'
          ->> 'risencare_role'
    ) is distinct from 'facility_system'
    then
        raise exception
            'facility_system role required'
            using errcode = '42501';
    end if;

    if
        p_facility_id is null
        or p_recording_id is null
        or p_segments is null
    then
        raise exception
            'voice transcription segment context is required'
            using errcode = '22004';
    end if;

    if jsonb_typeof(p_segments) <> 'array' then
        raise exception
            'voice transcription segments must be an array'
            using errcode = '22023';
    end if;

    /*
     * Lock the parent recording so concurrent retries for the
     * same recording cannot create competing provenance sets.
     */
    perform 1
    from public.communication_recordings as cr
    where cr.id = p_recording_id
      and cr.facility_id = p_facility_id
      and cr.upload_status = 'uploaded'
      and cr.transcription_status = 'completed'
    for update;

    if not found then
        raise exception
            'completed voice transcription recording not found'
            using errcode = 'P0002';
    end if;

    /*
     * Every supplied segment must have the exact trusted shape.
     */
    if exists (
        select 1
        from jsonb_array_elements(p_segments)
            as item(value)
        where jsonb_typeof(item.value) <> 'object'
           or jsonb_typeof(
                item.value -> 'segment_index'
              ) <> 'number'
           or jsonb_typeof(
                item.value -> 'start_ms'
              ) <> 'number'
           or jsonb_typeof(
                item.value -> 'end_ms'
              ) <> 'number'
           or jsonb_typeof(
                item.value -> 'transcript_text'
              ) <> 'string'
           or (
                item.value ->> 'segment_index'
              ) !~ '^[0-9]+$'
           or (
                item.value ->> 'start_ms'
              ) !~ '^[0-9]+$'
           or (
                item.value ->> 'end_ms'
              ) !~ '^[0-9]+$'
           or (
                item.value ->> 'end_ms'
              )::bigint
              <
              (
                item.value ->> 'start_ms'
              )::bigint
           or btrim(
                item.value ->> 'transcript_text'
              ) = ''
    ) then
        raise exception
            'voice transcription segment is invalid'
            using errcode = '22023';
    end if;

    select count(*)
    into v_input_count
    from jsonb_array_elements(p_segments);

    /*
     * Segment indexes must be unique and contiguous from zero.
     */
    if exists (
        select 1
        from (
            select
                (
                    item.value
                      ->> 'segment_index'
                )::integer
                    as segment_index,
                count(*) as duplicate_count
            from jsonb_array_elements(p_segments)
                as item(value)
            group by
                (
                    item.value
                      ->> 'segment_index'
                )::integer
            having count(*) <> 1
        ) as duplicates
    ) then
        raise exception
            'voice transcription segment indexes are duplicated'
            using errcode = '22023';
    end if;

    if
        v_input_count > 0
        and (
            select
                min(
                    (
                        item.value
                          ->> 'segment_index'
                    )::integer
                ) <> 0
                or
                max(
                    (
                        item.value
                          ->> 'segment_index'
                    )::integer
                ) <> v_input_count - 1
            from jsonb_array_elements(p_segments)
                as item(value)
        )
    then
        raise exception
            'voice transcription segment indexes must be contiguous'
            using errcode = '22023';
    end if;

    select count(*)
    into v_existing_count
    from public.voice_transcription_segments
    where recording_id = p_recording_id;

    /*
     * Provenance is immutable:
     * an exact retry succeeds, a conflicting retry is rejected.
     */
    if v_existing_count > 0 then
        if v_existing_count <> v_input_count then
            raise exception
                'voice transcription segment provenance conflict'
                using errcode = '23505';
        end if;

        select count(*)
        into v_mismatch_count
        from jsonb_array_elements(p_segments)
            as item(value)
        left join public.voice_transcription_segments
            as existing
          on existing.recording_id =
                p_recording_id
         and existing.segment_index =
                (
                    item.value
                      ->> 'segment_index'
                )::integer
         and existing.start_ms =
                (
                    item.value
                      ->> 'start_ms'
                )::bigint
         and existing.end_ms =
                (
                    item.value
                      ->> 'end_ms'
                )::bigint
         and existing.transcript_text =
                item.value
                  ->> 'transcript_text'
        where existing.id is null;

        if v_mismatch_count > 0 then
            raise exception
                'voice transcription segment provenance conflict'
                using errcode = '23505';
        end if;

        return v_existing_count;
    end if;

    insert into
        public.voice_transcription_segments (
            recording_id,
            segment_index,
            start_ms,
            end_ms,
            transcript_text
        )
    select
        p_recording_id,
        (
            item.value
              ->> 'segment_index'
        )::integer,
        (
            item.value
              ->> 'start_ms'
        )::bigint,
        (
            item.value
              ->> 'end_ms'
        )::bigint,
        item.value
          ->> 'transcript_text'
    from jsonb_array_elements(p_segments)
        as item(value);

    return v_input_count;
end;
$function$;


revoke all
on function
public.persist_voice_transcription_segments(
    uuid,
    uuid,
    jsonb
)
from public;

revoke all
on function
public.persist_voice_transcription_segments(
    uuid,
    uuid,
    jsonb
)
from anon;

grant execute
on function
public.persist_voice_transcription_segments(
    uuid,
    uuid,
    jsonb
)
to authenticated;


commit;
