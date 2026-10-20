begin;

create or replace function
public.get_voice_communication_revision_state(
    p_facility_id uuid,
    p_communication_log_id uuid
)
returns table (
    communication_log_id uuid,
    transcript text,
    ai_summary text,
    confirmed_summary text
)
language plpgsql
security definer
set search_path = public
as $function$
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
    then
        raise exception
            'voice communication revision state context is required'
            using errcode = '22004';
    end if;

    return query
    select
        cl.id,
        cl.transcript,
        cl.ai_summary,
        cl.confirmed_summary
    from public.communication_logs as cl
    where cl.id =
        p_communication_log_id
      and cl.facility_id =
        p_facility_id
      and cl.communication_type =
        'phone'
      and cl.communication_route =
        'risen_care_telephony';
end;
$function$;

revoke all on function
public.get_voice_communication_revision_state(
    uuid,
    uuid
)
from public;

revoke all on function
public.get_voice_communication_revision_state(
    uuid,
    uuid
)
from anon;

grant execute on function
public.get_voice_communication_revision_state(
    uuid,
    uuid
)
to authenticated;

commit;
