begin;

create or replace function public.apply_voice_communication_event(
    p_provider_call_id text,
    p_event_status text,
    p_event_timestamp timestamptz,
    p_start_time timestamptz default null,
    p_end_time timestamptz default null
)
returns table(
    transition_status text,
    communication_log_id uuid,
    result_status text,
    connected_at timestamptz,
    ended_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_provider_call_id text;
    v_event_status text;

    v_log_id uuid;
    v_requested_at timestamptz;
    v_connected_at timestamptz;
    v_ended_at timestamptz;
    v_result_status text;

    v_new_connected_at timestamptz;
    v_new_ended_at timestamptz;
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

    v_event_status =
        lower(
            nullif(
                btrim(
                    coalesce(
                        p_event_status,
                        ''
                    )
                ),
                ''
            )
        );

    if v_event_status is null then
        raise exception
            'voice event status is required'
            using errcode = '22004';
    end if;

    if v_event_status not in (
        'started',
        'ringing',
        'answered',
        'completed',
        'busy',
        'cancelled',
        'unanswered',
        'rejected',
        'failed',
        'timeout'
    ) then
        raise exception
            'unsupported voice event status'
            using errcode = '22023';
    end if;

    if p_event_timestamp is null then
        raise exception
            'voice event timestamp is required'
            using errcode = '22004';
    end if;

    if v_event_status = 'completed' then
        if
            p_start_time is null
            or p_end_time is null
        then
            raise exception
                'completed voice event requires start and end time'
                using errcode = '22004';
        end if;

        if p_end_time < p_start_time then
            raise exception
                'voice event end time precedes start time'
                using errcode = '22007';
        end if;
    end if;

    select
        cl.id,
        cl.requested_at,
        cl.connected_at,
        cl.ended_at,
        cl.result_status
    into
        v_log_id,
        v_requested_at,
        v_connected_at,
        v_ended_at,
        v_result_status
    from public.communication_logs as cl
    where cl.telephony_provider =
          'vonage'
      and cl.provider_call_id =
          v_provider_call_id
    for update;

    if v_log_id is null then
        raise exception
            'voice communication log not found'
            using errcode = 'P0002';
    end if;

    /*
     * started/ringing are informational only.
     * They must never move business state.
     */
    if v_event_status in (
        'started',
        'ringing'
    ) then
        return query
        select
            'unchanged'::text,
            v_log_id,
            v_result_status,
            v_connected_at,
            v_ended_at;

        return;
    end if;

    /*
     * Provider events must never overwrite terminal
     * or staff-confirmed business outcomes.
     */
    if v_result_status in (
        'completed',
        'no_answer',
        'failed',
        'staff_confirmed_contact',
        'staff_confirmed_no_contact'
    ) then
        return query
        select
            'unchanged'::text,
            v_log_id,
            v_result_status,
            v_connected_at,
            v_ended_at;

        return;
    end if;

    if v_event_status = 'answered' then
        if v_result_status = 'requested' then
            v_new_connected_at =
                greatest(
                    p_event_timestamp,
                    v_requested_at
                );

            update public.communication_logs
            set
                result_status =
                    'connected',
                result_source =
                    'telephony_provider',
                connected_at =
                    v_new_connected_at
            where id =
                  v_log_id;

            v_result_status =
                'connected';

            v_connected_at =
                v_new_connected_at;

            return query
            select
                'updated'::text,
                v_log_id,
                v_result_status,
                v_connected_at,
                v_ended_at;

            return;
        end if;

        return query
        select
            'unchanged'::text,
            v_log_id,
            v_result_status,
            v_connected_at,
            v_ended_at;

        return;
    end if;

    if v_event_status = 'completed' then
        if v_result_status in (
            'requested',
            'connected'
        ) then
            v_new_connected_at =
                coalesce(
                    v_connected_at,
                    greatest(
                        p_start_time,
                        v_requested_at
                    )
                );

            v_new_ended_at =
                greatest(
                    p_end_time,
                    v_new_connected_at,
                    v_requested_at
                );

            update public.communication_logs
            set
                result_status =
                    'completed',
                result_source =
                    'telephony_provider',
                connected_at =
                    v_new_connected_at,
                ended_at =
                    v_new_ended_at
            where id =
                  v_log_id;

            return query
            select
                'updated'::text,
                v_log_id,
                'completed'::text,
                v_new_connected_at,
                v_new_ended_at;

            return;
        end if;
    end if;

    if v_event_status in (
        'busy',
        'cancelled',
        'unanswered',
        'timeout'
    ) then
        if v_result_status = 'requested' then
            v_new_ended_at =
                greatest(
                    p_event_timestamp,
                    v_requested_at
                );

            update public.communication_logs
            set
                result_status =
                    'no_answer',
                result_source =
                    'telephony_provider',
                ended_at =
                    v_new_ended_at
            where id =
                  v_log_id;

            return query
            select
                'updated'::text,
                v_log_id,
                'no_answer'::text,
                v_connected_at,
                v_new_ended_at;

            return;
        end if;
    end if;

    if v_event_status in (
        'rejected',
        'failed'
    ) then
        if v_result_status = 'requested' then
            v_new_ended_at =
                greatest(
                    p_event_timestamp,
                    v_requested_at
                );

            update public.communication_logs
            set
                result_status =
                    'failed',
                result_source =
                    'telephony_provider',
                ended_at =
                    v_new_ended_at
            where id =
                  v_log_id;

            return query
            select
                'updated'::text,
                v_log_id,
                'failed'::text,
                v_connected_at,
                v_new_ended_at;

            return;
        end if;
    end if;

    /*
     * Any out-of-order event that cannot safely advance
     * the current business state is idempotently ignored.
     */
    return query
    select
        'unchanged'::text,
        v_log_id,
        v_result_status,
        v_connected_at,
        v_ended_at;
end;
$function$;

revoke all
on function public.apply_voice_communication_event(
    text,
    text,
    timestamptz,
    timestamptz,
    timestamptz
)
from public;

revoke all
on function public.apply_voice_communication_event(
    text,
    text,
    timestamptz,
    timestamptz,
    timestamptz
)
from anon;

grant execute
on function public.apply_voice_communication_event(
    text,
    text,
    timestamptz,
    timestamptz,
    timestamptz
)
to authenticated;

commit;
