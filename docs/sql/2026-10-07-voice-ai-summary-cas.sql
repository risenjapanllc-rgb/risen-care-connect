begin;

create or replace function
public.persist_voice_communication_ai_summary_if_transcript_matches(
    p_facility_id uuid,
    p_communication_log_id uuid,
    p_source_transcript text,
    p_ai_summary text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_updated integer;
begin
    if coalesce(
        auth.jwt()
          -> 'app_metadata'
          ->> 'risencare_role',
        ''
    ) not in (
        'facility_system',
        'connector_trust_boundary'
    )
    then
        raise exception
            'trusted voice system role required'
            using errcode = '42501';
    end if;

    if
        p_facility_id is null
        or p_communication_log_id is null
        or p_source_transcript is null
        or p_ai_summary is null
    then
        raise exception
            'voice AI summary context is required'
            using errcode = '22004';
    end if;

    update public.communication_logs
    set ai_summary =
        p_ai_summary
    where id =
        p_communication_log_id
      and facility_id =
        p_facility_id
      and communication_type =
        'phone'
      and communication_route =
        'risen_care_telephony'
      and transcript
            is not distinct from
            p_source_transcript;

    get diagnostics
        v_updated =
            row_count;

    return
        v_updated = 1;
end;
$function$;

revoke all on function
public.persist_voice_communication_ai_summary_if_transcript_matches(
    uuid,
    uuid,
    text,
    text
)
from public;

revoke all on function
public.persist_voice_communication_ai_summary_if_transcript_matches(
    uuid,
    uuid,
    text,
    text
)
from anon;

grant execute on function
public.persist_voice_communication_ai_summary_if_transcript_matches(
    uuid,
    uuid,
    text,
    text
)
to authenticated;

commit;
