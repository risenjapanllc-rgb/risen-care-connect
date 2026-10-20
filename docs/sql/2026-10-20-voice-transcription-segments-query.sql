begin;


create or replace function
public.get_voice_transcription_segments(
    p_facility_id uuid,
    p_recording_id uuid
)
returns table (
    segment_index integer,
    start_ms bigint,
    end_ms bigint,
    transcript_text text
)
language plpgsql
security definer
set search_path = public
as $function$
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
    then
        raise exception
            'voice transcription segment context is required'
            using errcode = '22004';
    end if;

    /*
     * Facility ownership is resolved from the immutable
     * parent recording. Never trust a facility identifier
     * supplied independently of the recording.
     */
    if not exists (
        select 1
        from public.communication_recordings as cr
        where cr.id = p_recording_id
          and cr.facility_id = p_facility_id
          and cr.upload_status = 'uploaded'
          and cr.transcription_status = 'completed'
    ) then
        raise exception
            'completed voice transcription recording not found'
            using errcode = 'P0002';
    end if;

    return query
    select
        vts.segment_index,
        vts.start_ms,
        vts.end_ms,
        vts.transcript_text
    from public.voice_transcription_segments as vts
    where vts.recording_id = p_recording_id
    order by vts.segment_index;
end;
$function$;


revoke all
on function
public.get_voice_transcription_segments(
    uuid,
    uuid
)
from public;

revoke all
on function
public.get_voice_transcription_segments(
    uuid,
    uuid
)
from anon;

grant execute
on function
public.get_voice_transcription_segments(
    uuid,
    uuid
)
to authenticated;


commit;
