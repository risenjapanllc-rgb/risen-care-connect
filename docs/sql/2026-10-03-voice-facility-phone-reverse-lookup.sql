begin;

create or replace function public.get_facility_by_phone_number(
    p_phone_number text
)
returns table(
    id uuid,
    facility_id uuid,
    phone_number text,
    provider text,
    status text,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_phone_number text;
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

    v_phone_number =
        nullif(
            btrim(
                coalesce(
                    p_phone_number,
                    ''
                )
            ),
            ''
        );

    if v_phone_number is null then
        return;
    end if;

    return query
    select
        fpn.id,
        fpn.facility_id,
        fpn.phone_number,
        fpn.provider,
        fpn.status,
        fpn.created_at,
        fpn.updated_at
    from public.facility_phone_numbers as fpn
    where fpn.phone_number =
          v_phone_number
      and fpn.provider =
          'vonage'
      and fpn.status =
          'active';
end;
$function$;

revoke all
on function public.get_facility_by_phone_number(text)
from public;

revoke all
on function public.get_facility_by_phone_number(text)
from anon;

grant execute
on function public.get_facility_by_phone_number(text)
to authenticated;

commit;
