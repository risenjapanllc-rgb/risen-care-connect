begin;

create or replace function public.create_voice_communication_log(
    p_facility_id uuid,
    p_case_id uuid,
    p_contact_id uuid,
    p_provider_call_id text
)
returns table(
    communication_log_id uuid
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_log_id uuid;
    v_provider_call_id text;
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
        or p_case_id is null
        or p_contact_id is null
    then
        raise exception
            'facility, case and contact are required'
            using errcode = '22004';
    end if;

    v_provider_call_id =
        nullif(
            btrim(
                coalesce(
                    p_provider_call_id,
                    ''
                )
            ),
            ''
        );

    if v_provider_call_id is null then
        raise exception
            'provider call id is required'
            using errcode = '22004';
    end if;

    if length(v_provider_call_id) > 256 then
        raise exception
            'provider call id is too long'
            using errcode = '22001';
    end if;

    if not exists (
        select 1
        from public.emergency_cases as ecase
        join public.emergency_contacts as ec
          on ec.facility_id = ecase.facility_id
        where ecase.id = p_case_id
          and ecase.facility_id = p_facility_id
          and ecase.status = 'active'
          and ec.id = p_contact_id
          and ec.is_active = true
          and (
              ec.resident_id is null
              or (
                  ecase.resident_id is not null
                  and ec.resident_id = ecase.resident_id
              )
          )
    ) then
        raise exception
            'voice communication target not found'
            using errcode = 'P0002';
    end if;

    insert into public.communication_logs (
        case_id,
        facility_id,
        contact_id,
        communication_type,
        communication_route,
        requested_at,
        result_status,
        result_source,
        direction,
        telephony_provider,
        provider_call_id
    )
    values (
        p_case_id,
        p_facility_id,
        p_contact_id,
        'phone',
        'risen_care_telephony',
        now(),
        'requested',
        'telephony_provider',
        'outbound',
        'vonage',
        v_provider_call_id
    )
    returning id
    into v_log_id;

    return query
    select v_log_id;
end;
$function$;

revoke all
on function public.create_voice_communication_log(
    uuid,
    uuid,
    uuid,
    text
)
from public;

revoke all
on function public.create_voice_communication_log(
    uuid,
    uuid,
    uuid,
    text
)
from anon;

grant execute
on function public.create_voice_communication_log(
    uuid,
    uuid,
    uuid,
    text
)
to authenticated;

commit;
