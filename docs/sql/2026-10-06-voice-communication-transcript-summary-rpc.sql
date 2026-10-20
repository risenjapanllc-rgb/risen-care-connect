begin;

create or replace function
public.persist_voice_communication_transcript(
    p_facility_id uuid,
    p_communication_log_id uuid,
    p_recording_id uuid,
    p_transcript text
)
returns void
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
        or p_communication_log_id is null
        or p_recording_id is null
        or p_transcript is null
    then
        raise exception
            'voice communication transcript context is required'
            using errcode = '22004';
    end if;

    if not exists (
        select 1
        from public.communication_logs as cl
        join public.communication_recordings as cr
          on cr.communication_log_id = cl.id
        where cl.id = p_communication_log_id
          and cl.facility_id = p_facility_id
          and cl.communication_type = 'phone'
          and cl.communication_route = 'risen_care_telephony'
          and cr.id = p_recording_id
          and cr.facility_id = p_facility_id
          and cr.transcription_status = 'completed'
          and cr.transcription_text
                is not distinct from p_transcript
    ) then
        raise exception
            'completed voice transcription not found'
            using errcode = 'P0002';
    end if;

    update public.communication_logs
    set transcript = p_transcript
    where id = p_communication_log_id
      and facility_id = p_facility_id;
end;
$function$;


create or replace function
public.persist_voice_communication_ai_summary(
    p_facility_id uuid,
    p_communication_log_id uuid,
    p_ai_summary text
)
returns void
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
        or p_communication_log_id is null
        or p_ai_summary is null
    then
        raise exception
            'voice communication summary context is required'
            using errcode = '22004';
    end if;

    if not exists (
        select 1
        from public.communication_logs as cl
        where cl.id = p_communication_log_id
          and cl.facility_id = p_facility_id
          and cl.communication_type = 'phone'
          and cl.communication_route = 'risen_care_telephony'
          and cl.transcript is not null
    ) then
        raise exception
            'voice communication transcript not found'
            using errcode = 'P0002';
    end if;

    update public.communication_logs
    set ai_summary = p_ai_summary
    where id = p_communication_log_id
      and facility_id = p_facility_id;
end;
$function$;


revoke all on function
public.persist_voice_communication_transcript(
    uuid,
    uuid,
    uuid,
    text
)
from public;

revoke all on function
public.persist_voice_communication_transcript(
    uuid,
    uuid,
    uuid,
    text
)
from anon;

grant execute on function
public.persist_voice_communication_transcript(
    uuid,
    uuid,
    uuid,
    text
)
to authenticated;


revoke all on function
public.persist_voice_communication_ai_summary(
    uuid,
    uuid,
    text
)
from public;

revoke all on function
public.persist_voice_communication_ai_summary(
    uuid,
    uuid,
    text
)
from anon;

grant execute on function
public.persist_voice_communication_ai_summary(
    uuid,
    uuid,
    text
)
to authenticated;

commit;
