-- RISEN CARE Standard Meaning Candidate Query
--
-- Returns existing candidate submissions for one source template.
-- Connector/facility identity remains authoritative.

begin;

create or replace function public.get_standard_meaning_candidates(
    p_facility_id uuid,
    p_connector_id uuid,
    p_template_id uuid
)
returns table(
    candidate_id uuid,
    template_field_key text,
    proposed_meaning text,
    evidence jsonb,
    status text,
    submitted_at timestamp with time zone
)
language plpgsql
security definer
set search_path to ''
as $function$
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
        p_facility_id is null
        or p_connector_id is null
        or p_template_id is null
    then
        return;
    end if;

    perform 1
    from public.connector_registrations as cr
    where cr.connector_id =
        p_connector_id
      and cr.facility_id =
        p_facility_id
      and cr.active = true;

    if not found then
        return;
    end if;

    perform 1
    from public.source_templates as t
    where t.facility_id =
        p_facility_id
      and t.template_id =
        p_template_id;

    if not found then
        return;
    end if;

    return query
    select
        c.candidate_id,
        c.template_field_key,
        c.proposed_meaning,
        c.evidence,
        c.status,
        c.submitted_at
    from public.standard_meaning_candidates as c
    where c.facility_id =
        p_facility_id
      and c.template_id =
        p_template_id
    order by
        c.template_field_key;
end;
$function$;

revoke all
on function public.get_standard_meaning_candidates(
    uuid,
    uuid,
    uuid
)
from public;

grant execute
on function public.get_standard_meaning_candidates(
    uuid,
    uuid,
    uuid
)
to authenticated, service_role;

commit;
