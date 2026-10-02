begin;

create or replace function public.update_voice_recording_timing(
    p_recording_id uuid,
    p_facility_id uuid,
    p_provider_recording_id text,
    p_started_at timestamptz,
    p_ended_at timestamptz
)
returns table(
    status text,
    recording_id uuid,
    duration_ms bigint
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_provider_recording_id text;
    v_record public.communication_recordings%rowtype;
    v_duration_ms bigint;
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

    if
        p_recording_id is null
        or p_facility_id is null
        or p_started_at is null
        or p_ended_at is null
    then
        raise exception
            'voice recording timing identity is required'
            using errcode = '22004';
    end if;

    v_provider_recording_id =
        btrim(
            coalesce(
                p_provider_recording_id,
                ''
            )
        );

    if
        v_provider_recording_id = ''
        or length(
            v_provider_recording_id
        ) > 128
        or v_provider_recording_id !~
            '^[A-Za-z0-9_-]+$'
    then
        raise exception
            'provider recording id is invalid'
            using errcode = '22023';
    end if;

    if p_ended_at < p_started_at then
        raise exception
            'voice recording timing order is invalid'
            using errcode = '22023';
    end if;

    v_duration_ms =
        round(
            extract(
                epoch from (
                    p_ended_at -
                    p_started_at
                )
            ) * 1000
        )::bigint;

    if v_duration_ms < 0 then
        raise exception
            'voice recording duration is invalid'
            using errcode = '22023';
    end if;

    select cr.*
    into v_record
    from public.communication_recordings as cr
    where cr.id =
        p_recording_id
      and cr.facility_id =
        p_facility_id
      and cr.provider_recording_id =
        v_provider_recording_id
      and cr.storage_bucket =
        'communication-recordings'
    for update;

    if not found then
        raise exception
            'voice recording metadata not found'
            using errcode = 'P0002';
    end if;

    if v_record.upload_status <>
        'uploaded'
    then
        raise exception
            'voice recording is not uploaded'
            using errcode = '23514';
    end if;

    /*
     * Provider timing is immutable evidence.
     *
     * Same values are idempotent.
     * Different values must never silently overwrite
     * previously persisted provider evidence.
     */
    if
        v_record.started_at is not null
        or v_record.ended_at is not null
    then
        if
            v_record.started_at
                is distinct from
                p_started_at
            or v_record.ended_at
                is distinct from
                p_ended_at
            or v_record.duration_ms
                is distinct from
                v_duration_ms
        then
            raise exception
                'voice recording timing idempotency conflict'
                using errcode = '23505';
        end if;

        return query
        select
            'timed'::text,
            v_record.id,
            v_record.duration_ms;

        return;
    end if;

    if v_record.duration_ms <> 0 then
        raise exception
            'voice recording timing idempotency conflict'
            using errcode = '23505';
    end if;

    update public.communication_recordings
    set
        started_at =
            p_started_at,
        ended_at =
            p_ended_at,
        duration_ms =
            v_duration_ms,
        updated_at =
            now()
    where id =
        v_record.id;

    return query
    select
        'timed'::text,
        v_record.id,
        v_duration_ms;
end;
$function$;


revoke all
on function public.update_voice_recording_timing(
    uuid,
    uuid,
    text,
    timestamptz,
    timestamptz
)
from public;

revoke all
on function public.update_voice_recording_timing(
    uuid,
    uuid,
    text,
    timestamptz,
    timestamptz
)
from anon;

grant execute
on function public.update_voice_recording_timing(
    uuid,
    uuid,
    text,
    timestamptz,
    timestamptz
)
to authenticated;

commit;
