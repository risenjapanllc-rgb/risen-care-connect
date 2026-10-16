-- RISEN CARE
-- RISEN admin Standard Meaning Candidate acceptance boundary
--
-- Browser / admin UI:
--   authenticated JWT with
--   app_metadata.risencare_role = risen_admin
--
-- Existing core promotion RPC remains service_role-only.

begin;


create or replace function public.risen_admin_accept_standard_meaning_candidate(
    p_candidate_id uuid,
    p_entity_name text,
    p_field_name text,
    p_display_name text,
    p_synonyms text[],
    p_semantic_type text
)
returns table(
    status text,
    meaning_id uuid
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
        result.status,
        result.meaning_id
    from public.accept_standard_meaning_candidate(
        p_candidate_id,
        p_entity_name,
        p_field_name,
        p_display_name,
        p_synonyms,
        p_semantic_type
    ) as result;
end;
$function$;


revoke all
on function public.risen_admin_accept_standard_meaning_candidate(
    uuid,
    text,
    text,
    text,
    text[],
    text
)
from public, anon;


grant execute
on function public.risen_admin_accept_standard_meaning_candidate(
    uuid,
    text,
    text,
    text,
    text[],
    text
)
to authenticated;


commit;
