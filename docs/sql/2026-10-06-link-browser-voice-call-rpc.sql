begin;

create or replace function public.link_emergency_browser_voice_call(
    p_facility_id uuid,
    p_case_id uuid,
    p_contact_id uuid,
    p_voice_call_intent_id text,
    p_communication_log_id uuid
)
returns public.emergency_events
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_intent_id text;
    v_event public.emergency_events%rowtype;
    v_existing_communication_log_id text;
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

    if
        p_facility_id is null
        or p_case_id is null
        or p_contact_id is null
        or p_communication_log_id is null
    then
        raise exception
            'voice call link context is required'
            using errcode = '22004';
    end if;

    v_intent_id =
        btrim(
            coalesce(
                p_voice_call_intent_id,
                ''
            )
        );

    if
        v_intent_id = ''
        or length(v_intent_id) > 128
        or v_intent_id !~ '^[A-Za-z0-9_-]+$'
    then
        raise exception
            'voice call intent id is invalid'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from public.communication_logs as cl
        where cl.id =
            p_communication_log_id
          and cl.facility_id =
            p_facility_id
          and cl.case_id =
            p_case_id
          and cl.contact_id =
            p_contact_id
          and cl.communication_type =
            'phone'
          and cl.communication_route =
            'risen_care_telephony'
          and cl.direction =
            'outbound'
          and cl.telephony_provider =
            'vonage'
    )
    then
        raise exception
            'voice communication log not found'
            using errcode = 'P0002';
    end if;

    select e.*
    into v_event
    from public.emergency_events as e
    where e.facility_id =
        p_facility_id
      and e.case_id =
        p_case_id
      and e.event_type =
        'emergency_contact_call_started'
      and e.metadata
            ->> 'contact_id' =
        p_contact_id::text
      and e.metadata
            ->> 'voice_call_intent_id' =
        v_intent_id
    limit 1;

    if not found then
        raise exception
            'emergency voice call event not found'
            using errcode = 'P0002';
    end if;

    v_existing_communication_log_id =
        nullif(
            btrim(
                coalesce(
                    v_event.metadata
                        ->> 'communication_log_id',
                    ''
                )
            ),
            ''
        );

    if
        v_existing_communication_log_id is not null
        and v_existing_communication_log_id
            is distinct from
            p_communication_log_id::text
    then
        raise exception
            'emergency voice call link conflict'
            using errcode = '23505';
    end if;

    update public.emergency_events
    set metadata =
        coalesce(metadata, '{}'::jsonb)
        ||
        jsonb_build_object(
            'communication_log_id',
            p_communication_log_id
        )
    where id = v_event.id
    returning *
    into v_event;

    return v_event;
end;
$function$;

revoke all
on function public.link_emergency_browser_voice_call(
    uuid,
    uuid,
    uuid,
    text,
    uuid
)
from public;

revoke all
on function public.link_emergency_browser_voice_call(
    uuid,
    uuid,
    uuid,
    text,
    uuid
)
from anon;

grant execute
on function public.link_emergency_browser_voice_call(
    uuid,
    uuid,
    uuid,
    text,
    uuid
)
to authenticated;

commit;
