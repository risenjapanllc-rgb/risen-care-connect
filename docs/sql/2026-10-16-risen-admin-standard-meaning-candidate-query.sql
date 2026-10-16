-- RISEN CARE
-- RISEN admin Standard Meaning Candidate query boundary

begin;


create or replace function public.risen_admin_list_standard_meaning_candidates()
returns table(
    candidate_id uuid,
    facility_id uuid,
    connector_id uuid,
    template_id uuid,
    template_field_key text,
    proposed_meaning text,
    evidence jsonb,
    status text,
    accepted_meaning_id uuid,
    submitted_at timestamp with time zone,
    accepted_at timestamp with time zone
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
        'risen_admin'
    then
        raise exception
            'risen_admin role required'
            using errcode = '42501';
    end if;

    return query
    select
        c.candidate_id,
        c.facility_id,
        c.connector_id,
        c.template_id,
        c.template_field_key,
        c.proposed_meaning,
        c.evidence,
        c.status,
        c.accepted_meaning_id,
        c.submitted_at,
        c.accepted_at
    from public.standard_meaning_candidates as c
    order by
        case
            when c.status = 'submitted' then 0
            else 1
        end,
        c.submitted_at desc,
        c.candidate_id;
end;
$function$;


revoke all
on function public.risen_admin_list_standard_meaning_candidates()
from public, anon;


grant execute
on function public.risen_admin_list_standard_meaning_candidates()
to authenticated;


commit;
