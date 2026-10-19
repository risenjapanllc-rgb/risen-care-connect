begin;

create or replace function public.update_standard_meaning_candidate_clarification(
    p_facility_id uuid,
    p_connector_id uuid,
    p_template_id uuid,
    p_template_field_key text,
    p_staff_clarification text,
    p_clarified_at timestamp with time zone
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
    v_template_field_key text;
    v_staff_clarification text;

    v_candidate
        public.standard_meaning_candidates%rowtype;
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
        or p_clarified_at is null
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    v_template_field_key :=
        nullif(
            btrim(
                coalesce(
                    p_template_field_key,
                    ''
                )
            ),
            ''
        );

    v_staff_clarification :=
        nullif(
            btrim(
                coalesce(
                    p_staff_clarification,
                    ''
                )
            ),
            ''
        );

    if
        v_template_field_key is null
        or v_staff_clarification is null
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    perform 1
    from public.connector_registrations as cr
    where cr.connector_id =
        p_connector_id
      and cr.facility_id =
        p_facility_id
      and cr.active = true
    for key share;

    if not found then
        return query
        select
            'denied'::text,
            null::uuid;
        return;
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(
            p_facility_id::text
            || E'\x1f'
            || p_template_id::text
            || E'\x1f'
            || v_template_field_key
            || E'\x1f'
            || 'standard_meaning_candidate_clarification',
            0
        )
    );

    select c.*
    into v_candidate
    from public.standard_meaning_candidates as c
    where c.facility_id =
        p_facility_id
      and c.connector_id =
        p_connector_id
      and c.template_id =
        p_template_id
      and c.template_field_key =
        v_template_field_key
    for update;

    if not found then
        return query
        select
            'denied'::text,
            null::uuid;
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
                        ->> 'staffClarification',
                    ''
                )
            ),
            ''
        ) =
        v_staff_clarification
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
                    evidence,
                    '{staffClarification}',
                    to_jsonb(
                        v_staff_clarification
                    ),
                    true
                ),
                '{staffClarificationUpdatedAt}',
                to_jsonb(
                    p_clarified_at
                ),
                true
            ),
        updated_at = now()
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
on function public.update_standard_meaning_candidate_clarification(
    uuid,
    uuid,
    uuid,
    text,
    text,
    timestamp with time zone
)
from public;

grant execute
on function public.update_standard_meaning_candidate_clarification(
    uuid,
    uuid,
    uuid,
    text,
    text,
    timestamp with time zone
)
to authenticated, service_role;

commit;
