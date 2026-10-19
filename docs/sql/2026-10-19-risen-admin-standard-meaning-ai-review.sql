begin;

create or replace function
public.risen_admin_update_standard_meaning_candidate_ai_review(
    p_candidate_id uuid,
    p_mode text,
    p_facility_question text,
    p_reviewed_at timestamp with time zone
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
    v_mode text;
    v_facility_question text;

    v_candidate
        public.standard_meaning_candidates%rowtype;

    v_ai_review jsonb;
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
        or p_reviewed_at is null
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    v_mode :=
        nullif(
            btrim(
                coalesce(
                    p_mode,
                    ''
                )
            ),
            ''
        );

    if
        v_mode is null
        or v_mode not in (
            'existing',
            'new',
            'review'
        )
    then
        return query
        select
            'invalid'::text,
            p_candidate_id;
        return;
    end if;

    v_facility_question :=
        btrim(
            coalesce(
                p_facility_question,
                ''
            )
        );

    if
        v_mode = 'review'
        and v_facility_question = ''
    then
        return query
        select
            'invalid'::text,
            p_candidate_id;
        return;
    end if;

    if v_mode <> 'review' then
        v_facility_question := '';
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

    v_ai_review :=
        jsonb_build_object(
            'mode',
            v_mode,
            'facilityQuestion',
            v_facility_question,
            'reviewedAt',
            p_reviewed_at
        );

    update public.standard_meaning_candidates as c
    set
        evidence =
            jsonb_set(
                c.evidence,
                '{aiReview}',
                v_ai_review,
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
public.risen_admin_update_standard_meaning_candidate_ai_review(
    uuid,
    text,
    text,
    timestamp with time zone
)
from public, anon;

grant execute
on function
public.risen_admin_update_standard_meaning_candidate_ai_review(
    uuid,
    text,
    text,
    timestamp with time zone
)
to authenticated;

commit;
