begin;

create or replace function public.record_emergency_browser_voice_call_started(
    p_case_id uuid,
    p_contact_id uuid,
    p_voice_call_intent_id text
)
returns public.emergency_events
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_intent_id text;
    v_event public.emergency_events%rowtype;
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

    v_event =
        public.record_emergency_contact_call_started(
            p_case_id,
            p_contact_id,
            null
        );

    update public.emergency_events
    set metadata =
        coalesce(metadata, '{}'::jsonb)
        ||
        jsonb_build_object(
            'voice_call_intent_id',
            v_intent_id
        )
    where id = v_event.id
    returning *
    into v_event;

    return v_event;
end;
$function$;

create unique index if not exists
    emergency_events_voice_call_intent_uidx
on public.emergency_events (
    (metadata ->> 'voice_call_intent_id')
)
where event_type =
    'emergency_contact_call_started'
  and metadata
        ->> 'voice_call_intent_id'
        is not null;

revoke all
on function public.record_emergency_browser_voice_call_started(
    uuid,
    uuid,
    text
)
from public;

revoke all
on function public.record_emergency_browser_voice_call_started(
    uuid,
    uuid,
    text
)
from anon;

grant execute
on function public.record_emergency_browser_voice_call_started(
    uuid,
    uuid,
    text
)
to authenticated;

commit;
