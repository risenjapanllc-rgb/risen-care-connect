begin;

create or replace function public.get_voice_emergency_contact(
  p_facility_id uuid,
  p_case_id uuid,
  p_contact_id uuid
)
returns table(
  contact_id uuid,
  facility_id uuid,
  resident_id uuid,
  phone_number text,
  contact_name text,
  contact_type text
)
language plpgsql
security definer
set search_path = public
as $function$
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

  return query
  select
    ec.id,
    ec.facility_id,
    ec.resident_id,
    ec.phone_number,
    ec.contact_name,
    ec.contact_type
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
  limit 1;
end;
$function$;

revoke all
on function public.get_voice_emergency_contact(
  uuid,
  uuid,
  uuid
)
from public;

revoke all
on function public.get_voice_emergency_contact(
  uuid,
  uuid,
  uuid
)
from anon;

grant execute
on function public.get_voice_emergency_contact(
  uuid,
  uuid,
  uuid
)
to authenticated;

commit;
