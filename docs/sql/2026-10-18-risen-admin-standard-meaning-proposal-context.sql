begin;

create or replace function
public.risen_admin_get_standard_meaning_candidate_proposal_context(
    p_candidate_id uuid
)
returns table(
    candidate_id uuid,
    template_id uuid,
    template_field_key text,
    proposed_meaning text,
    evidence jsonb,
    semantic_type text
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_candidate
        public.standard_meaning_candidates%rowtype;

    v_semantic_types text[];
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

    select c.*
    into v_candidate
    from public.standard_meaning_candidates as c
    where c.candidate_id = p_candidate_id;

    if not found then
        return;
    end if;

    select
        array_agg(
            distinct c.document_type
            order by c.document_type
        )
    into v_semantic_types
    from public.source_document_template_bindings as b
    join public.connector_confirmed_document_types as c
      on c.facility_id = b.facility_id
     and c.connector_id = b.connector_id
     and c.source_document_key = b.source_document_key
     and c.source_updated_at
            is not distinct from
            b.source_updated_at
     and c.source_size
            is not distinct from
            b.source_size
    where
        b.facility_id =
            v_candidate.facility_id
        and b.connector_id =
            v_candidate.connector_id
        and b.template_id =
            v_candidate.template_id;

    return query
    select
        v_candidate.candidate_id,
        v_candidate.template_id,
        v_candidate.template_field_key,
        v_candidate.proposed_meaning,
        v_candidate.evidence,
        case
            when coalesce(
                cardinality(v_semantic_types),
                0
            ) = 1
            then v_semantic_types[1]
            else null
        end;
end;
$function$;

revoke all
on function
public.risen_admin_get_standard_meaning_candidate_proposal_context(
    uuid
)
from public, anon;

grant execute
on function
public.risen_admin_get_standard_meaning_candidate_proposal_context(
    uuid
)
to authenticated;

commit;
