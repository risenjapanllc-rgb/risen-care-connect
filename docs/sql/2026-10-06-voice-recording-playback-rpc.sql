begin;

create or replace function public.get_voice_recording_playback(
    p_facility_id uuid,
    p_recording_id uuid
)
returns table(
    recording_id uuid,
    communication_log_id uuid,
    storage_bucket text,
    storage_path text,
    duration_ms bigint,
    transcription_status text,
    transcription_text text
)
language plpgsql
security definer
set search_path = public
as $function$
begin
    if (
        auth.jwt() -> 'app_metadata' ->> 'risencare_role'
    ) is distinct from 'connector_trust_boundary'
    then
        raise exception
            'connector_trust_boundary role required'
            using errcode = '42501';
    end if;

    if
        p_facility_id is null
        or p_recording_id is null
    then
        raise exception
            'voice recording playback context is required'
            using errcode = '22004';
    end if;

    return query
    select
        cr.id,
        cr.communication_log_id,
        cr.storage_bucket,
        cr.storage_path,
        cr.duration_ms,
        cr.transcription_status,
        cr.transcription_text
    from public.communication_recordings as cr
    where cr.id = p_recording_id
      and cr.facility_id = p_facility_id
      and cr.upload_status = 'uploaded'
    limit 1;
end;
$function$;


revoke all
on function public.get_voice_recording_playback(
    uuid,
    uuid
)
from public;

revoke all
on function public.get_voice_recording_playback(
    uuid,
    uuid
)
from anon;

grant execute
on function public.get_voice_recording_playback(
    uuid,
    uuid
)
to authenticated;

commit;
