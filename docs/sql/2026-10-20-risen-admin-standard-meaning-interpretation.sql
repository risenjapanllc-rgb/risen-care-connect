begin;

create or replace function
public.risen_admin_update_standard_meaning_candidate_interpretation(
    p_candidate_id uuid,
    p_interpretation text,
    p_interpreted_at timestamp with time zone
)
returns table(
    status text,
    candidate_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_interpretation text;

    v_candidate
        public.standard_meaning_candidates%rowtype;
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

    if
        p_candidate_id is null
        or p_interpreted_at is null
    then
        return query
        select
            'invalid'::text,
            p_candidate_id;
        return;
    end if;

    v_interpretation :=
        nullif(
            btrim(
                coalesce(
                    p_interpretation,
                    ''
                )
            ),
            ''
        );

    if v_interpretation is null then
        return query
        select
            'invalid'::text,
            p_candidate_id;
        return;
    end if;

    select c.*
    into v_candidate
    from public.standard_meaning_candidates as c
    where c.candidate_id =
        p_candidate_id
    for update;

    if not found then
        return query
        select
            'denied'::text,
            p_candidate_id;
        return;
    end if;

    if v_candidate.status <> 'submitted' then
        return query
        select
            'denied'::text,
            v_candidate.candidate_id;
        return;
    end if;

    if
        nullif(
            btrim(
                coalesce(
                    v_candidate.evidence
                        ->> 'risenAdminInterpretation',
                    ''
                )
            ),
            ''
        ) =
        v_interpretation
    then
        return query
        select
            'unchanged'::text,
            v_candidate.candidate_id;
        return;
    end if;

    update public.standard_meaning_candidates as c
    set
        evidence =
            jsonb_set(
                jsonb_set(
                    coalesce(
                        c.evidence,
                        '{}'::jsonb
                    ),
                    '{risenAdminInterpretation}',
                    to_jsonb(
                        v_interpretation
                    ),
                    true
                ),
                '{risenAdminInterpretationUpdatedAt}',
                to_jsonb(
                    p_interpreted_at
                ),
                true
            ),
        updated_at =
            now()
    where c.candidate_id =
        v_candidate.candidate_id;

    return query
    select
        'updated'::text,
        v_candidate.candidate_id;

    return;
end;
$function$;

revoke all
on function
public.risen_admin_update_standard_meaning_candidate_interpretation(
    uuid,
    text,
    timestamp with time zone
)
from public, anon;

grant execute
on function
public.risen_admin_update_standard_meaning_candidate_interpretation(
    uuid,
    text,
    timestamp with time zone
)
to authenticated;

commit;
