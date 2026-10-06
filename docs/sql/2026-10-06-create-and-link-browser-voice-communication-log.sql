begin;

create or replace function public.create_and_link_browser_voice_communication_log(
    p_facility_id uuid,
    p_case_id uuid,
    p_contact_id uuid,
    p_provider_call_id text,
    p_voice_call_intent_id text
)
returns table(
    communication_log_id uuid
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_communication_log_id uuid;
begin
    if (
        auth.jwt()
        -> 'app_metadata'
        ->> 'risencare_role'
    ) is distinct from 'connector_trust_boundary'
    then
        raise exception
            'connector_trust_boundary role required'
            using errcode = '42501';
    end if;

    select
        result.communication_log_id
    into
        v_communication_log_id
    from public.create_voice_communication_log(
        p_facility_id,
        p_case_id,
        p_contact_id,
        p_provider_call_id
    ) as result;

    if v_communication_log_id is null then
        raise exception
            'voice communication log was not created'
            using errcode = 'P0001';
    end if;

    perform public.link_emergency_browser_voice_call(
        p_facility_id,
        p_case_id,
        p_contact_id,
        p_voice_call_intent_id,
        v_communication_log_id
    );

    return query
    select
        v_communication_log_id;
end;
$function$;

revoke all
on function public.create_and_link_browser_voice_communication_log(
    uuid,
    uuid,
    uuid,
    text,
    text
)
from public;

revoke all
on function public.create_and_link_browser_voice_communication_log(
    uuid,
    uuid,
    uuid,
    text,
    text
)
from anon;

grant execute
on function public.create_and_link_browser_voice_communication_log(
    uuid,
    uuid,
    uuid,
    text,
    text
)
to authenticated;

commit;
