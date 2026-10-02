begin;

create or replace function
public.claim_communication_recording_transcription_by_id(
    p_recording_id uuid,
    p_stale_after_seconds integer default 300,
    p_max_attempts integer default 5
)
returns public.communication_recordings
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_recording
        public.communication_recordings%rowtype;
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

    if p_recording_id is null then
        raise exception
            'recording_id is required'
            using errcode = '22004';
    end if;

    if
        p_stale_after_seconds is null
        or p_stale_after_seconds < 30
        or p_stale_after_seconds > 86400
    then
        raise exception
            'p_stale_after_seconds is out of range'
            using errcode = '22023';
    end if;

    if
        p_max_attempts is null
        or p_max_attempts < 1
        or p_max_attempts > 100
    then
        raise exception
            'p_max_attempts is out of range'
            using errcode = '22023';
    end if;

    select r.*
    into v_recording
    from public.communication_recordings as r
    where
        r.id = p_recording_id
        and r.upload_status = 'uploaded'
        and r.transcription_attempt_count <
            p_max_attempts
        and (
            (
                r.transcription_status =
                    'pending'
                and (
                    r.transcription_next_attempt_at
                        is null
                    or
                    r.transcription_next_attempt_at
                        <= now()
                )
            )
            or
            (
                r.transcription_status =
                    'processing'
                and
                r.transcription_started_at
                    is not null
                and
                r.transcription_started_at <=
                    now() - make_interval(
                        secs =>
                            p_stale_after_seconds
                    )
            )
        )
    for update of r
    skip locked;

    if not found then
        return null;
    end if;

    update public.communication_recordings
    set
        transcription_status =
            'processing',

        transcription_attempt_count =
            transcription_attempt_count + 1,

        transcription_started_at =
            now(),

        transcription_completed_at =
            null,

        transcription_next_attempt_at =
            null,

        transcription_claim_token =
            gen_random_uuid()

    where id = v_recording.id

    returning *
    into v_recording;

    return v_recording;
end;
$function$;

revoke all on function
public.claim_communication_recording_transcription_by_id(
    uuid,
    integer,
    integer
)
from public;

revoke all on function
public.claim_communication_recording_transcription_by_id(
    uuid,
    integer,
    integer
)
from anon;

grant execute on function
public.claim_communication_recording_transcription_by_id(
    uuid,
    integer,
    integer
)
to authenticated;

commit;
