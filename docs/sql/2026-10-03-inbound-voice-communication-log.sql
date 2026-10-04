begin;

create or replace function public.create_inbound_voice_communication_log(
    p_facility_id uuid,
    p_from_phone text,
    p_to_phone text,
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

    v_from_phone text;
    v_to_phone text;
    v_provider_call_id text;

    v_existing_id uuid;
    v_existing_facility_id uuid;
    v_existing_case_id uuid;
    v_existing_contact_id uuid;
    v_existing_communication_type text;
    v_existing_communication_route text;
    v_existing_direction text;
    v_existing_from_phone text;
    v_existing_to_phone text;
begin
    if (
        auth.jwt()
        -> 'app_metadata'
        ->> 'risencare_role'
    ) is distinct from
        'connector_trust_boundary'
    then
        raise exception
            'connector_trust_boundary role required'
            using errcode = '42501';
    end if;

    if p_facility_id is null then
        raise exception
            'facility is required'
            using errcode = '22004';
    end if;

    v_from_phone =
        nullif(
            btrim(
                coalesce(
                    p_from_phone,
                    ''
                )
            ),
            ''
        );

    v_to_phone =
        nullif(
            btrim(
                coalesce(
                    p_to_phone,
                    ''
                )
            ),
            ''
        );

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

    if
        v_from_phone is null
        or v_to_phone is null
        or v_provider_call_id is null
    then
        raise exception
            'inbound voice communication input is incomplete'
            using errcode = '22004';
    end if;

    if length(v_from_phone) > 64 then
        raise exception
            'from phone is too long'
            using errcode = '22001';
    end if;

    if length(v_to_phone) > 64 then
        raise exception
            'to phone is too long'
            using errcode = '22001';
    end if;

    if length(v_provider_call_id) > 256 then
        raise exception
            'provider call id is too long'
            using errcode = '22001';
    end if;

    if not exists (
        select 1
        from public.facility_phone_numbers as fpn
        where fpn.facility_id =
              p_facility_id
          and fpn.phone_number =
              v_to_phone
          and fpn.provider =
              'vonage'
          and fpn.status =
              'active'
    ) then
        raise exception
            'inbound facility phone number not found'
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
        from_phone,
        to_phone,
        telephony_provider,
        provider_call_id
    )
    values (
        null,
        p_facility_id,
        null,
        'phone',
        'risen_care_telephony',
        now(),
        'requested',
        'telephony_provider',
        'inbound',
        v_from_phone,
        v_to_phone,
        'vonage',
        v_provider_call_id
    )
    on conflict (
        telephony_provider,
        provider_call_id
    )
    where telephony_provider is not null
      and provider_call_id is not null
    do nothing
    returning id
    into v_log_id;

    if v_log_id is not null then
        return query
        select v_log_id;

        return;
    end if;

    select
        cl.id,
        cl.facility_id,
        cl.case_id,
        cl.contact_id,
        cl.communication_type,
        cl.communication_route,
        cl.direction,
        cl.from_phone,
        cl.to_phone
    into
        v_existing_id,
        v_existing_facility_id,
        v_existing_case_id,
        v_existing_contact_id,
        v_existing_communication_type,
        v_existing_communication_route,
        v_existing_direction,
        v_existing_from_phone,
        v_existing_to_phone
    from public.communication_logs as cl
    where cl.telephony_provider =
          'vonage'
      and cl.provider_call_id =
          v_provider_call_id
    for update;

    if v_existing_id is null then
        raise exception
            'inbound voice communication idempotency state missing'
            using errcode = 'P0001';
    end if;

    if
        v_existing_facility_id
            is distinct from p_facility_id
        or v_existing_case_id
            is not null
        or v_existing_contact_id
            is not null
        or v_existing_communication_type
            is distinct from 'phone'
        or v_existing_communication_route
            is distinct from
                'risen_care_telephony'
        or v_existing_direction
            is distinct from 'inbound'
        or v_existing_from_phone
            is distinct from v_from_phone
        or v_existing_to_phone
            is distinct from v_to_phone
    then
        raise exception
            'inbound voice communication idempotency conflict'
            using errcode = '23505';
    end if;

    return query
    select v_existing_id;
end;
$function$;

revoke all
on function public.create_inbound_voice_communication_log(
    uuid,
    text,
    text,
    text
)
from public;

revoke all
on function public.create_inbound_voice_communication_log(
    uuid,
    text,
    text,
    text
)
from anon;

grant execute
on function public.create_inbound_voice_communication_log(
    uuid,
    text,
    text,
    text
)
to authenticated;

commit;
