begin;

create or replace function public.get_voice_recordings_for_emergency_case(
    p_facility_id uuid,
    p_case_id uuid
)
returns table(
    communication_log_id uuid,
    recording_id uuid,
    duration_ms bigint,
    transcription_status text,
    started_at timestamptz
)
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
        or p_case_id is null
    then
        raise exception
            'facility_id and case_id are required'
            using errcode = '22004';
    end if;

    if not exists (
        select 1
        from public.emergency_cases as ec
        where ec.id = p_case_id
          and ec.facility_id = p_facility_id
    )
    then
        raise exception
            'emergency case not found'
            using errcode = 'P0002';
    end if;

    return query
    select
        cl.id,
        cr.id,
        cr.duration_ms,
        cr.transcription_status,
        cr.started_at
    from public.communication_logs as cl
    join public.communication_recordings as cr
      on cr.communication_log_id = cl.id
    where cl.case_id = p_case_id
      and cl.facility_id = p_facility_id
      and cr.facility_id = p_facility_id
      and cl.communication_type = 'phone'
      and cr.upload_status = 'uploaded'
    order by
        cr.started_at asc,
        cr.id asc;
end;
$function$;

revoke all
on function public.get_voice_recordings_for_emergency_case(
    uuid,
    uuid
)
from public;

revoke all
on function public.get_voice_recordings_for_emergency_case(
    uuid,
    uuid
)
from anon;

grant execute
on function public.get_voice_recordings_for_emergency_case(
    uuid,
    uuid
)
to authenticated;

commit;
