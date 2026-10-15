-- RISEN CARE Standard Meaning Candidates
--
-- Purpose:
-- - Preserve unresolved semantic knowledge before it becomes
--   a RISEN Standard Meaning.
-- - Keep candidate knowledge separate from
--   Source Template Semantic Authority.
-- - Never allow a facility or connector to create a canonical
--   Standard Meaning directly.
--
-- This file is a draft.
-- Do not apply to production until reviewed.

begin;

-- ============================================================
-- 1. Standard Meaning Candidates
-- ============================================================

create table public.standard_meaning_candidates (
    candidate_id uuid
        primary key
        default gen_random_uuid(),

    facility_id uuid
        not null
        references public.facilities(id),

    connector_id uuid
        not null,

    template_id uuid
        not null,

    template_field_key text
        not null,

    proposed_meaning text
        not null,

    evidence jsonb
        not null
        default '{}'::jsonb,

    status text
        not null
        default 'submitted',

    submitted_at timestamp with time zone
        not null,

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint standard_meaning_candidates_template_field_fk
        foreign key (
            facility_id,
            template_id,
            template_field_key
        )
        references public.source_template_fields (
            facility_id,
            template_id,
            template_field_key
        )
        on delete cascade,

    constraint standard_meaning_candidates_connector_fk
        foreign key (
            connector_id
        )
        references public.connector_registrations (
            connector_id
        ),

    constraint standard_meaning_candidates_proposed_meaning_nonblank
        check (
            nullif(
                btrim(proposed_meaning),
                ''
            ) is not null
        ),

    constraint standard_meaning_candidates_evidence_object
        check (
            jsonb_typeof(evidence) = 'object'
        ),

    constraint standard_meaning_candidates_status_check
        check (
            status in (
                'submitted',
                'accepted',
                'rejected',
                'superseded'
            )
        ),

    constraint standard_meaning_candidates_field_key
        unique (
            facility_id,
            template_id,
            template_field_key
        )
);

alter table public.standard_meaning_candidates
    enable row level security;

revoke all
on public.standard_meaning_candidates
from anon, authenticated;


-- ============================================================
-- 2. Submit Candidate RPC
-- ============================================================

create or replace function public.submit_standard_meaning_candidate(
    p_facility_id uuid,
    p_connector_id uuid,
    p_template_id uuid,
    p_template_field_key text,
    p_proposed_meaning text,
    p_evidence jsonb,
    p_submitted_at timestamp with time zone
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
    v_proposed_meaning text;
    v_evidence jsonb;

    v_existing
        public.standard_meaning_candidates%rowtype;

    v_candidate_id uuid;
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
        or p_submitted_at is null
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

    v_proposed_meaning :=
        nullif(
            btrim(
                coalesce(
                    p_proposed_meaning,
                    ''
                )
            ),
            ''
        );

    v_evidence :=
        coalesce(
            p_evidence,
            '{}'::jsonb
        );

    if
        v_template_field_key is null
        or v_proposed_meaning is null
        or jsonb_typeof(v_evidence) <> 'object'
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

    perform 1
    from public.source_template_fields as f
    where f.facility_id =
        p_facility_id
      and f.template_id =
        p_template_id
      and f.template_field_key =
        v_template_field_key
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
            || 'standard_meaning_candidate',
            0
        )
    );

    select *
    into v_existing
    from public.standard_meaning_candidates as c
    where c.facility_id =
        p_facility_id
      and c.template_id =
        p_template_id
      and c.template_field_key =
        v_template_field_key
    for update;

    if found then
        if
            v_existing.proposed_meaning =
                v_proposed_meaning
            and v_existing.evidence =
                v_evidence
        then
            return query
            select
                'unchanged'::text,
                v_existing.candidate_id;
            return;
        end if;

        return query
        select
            'conflict'::text,
            v_existing.candidate_id;
        return;
    end if;

    v_candidate_id :=
        gen_random_uuid();

    insert into public.standard_meaning_candidates (
        candidate_id,
        facility_id,
        connector_id,
        template_id,
        template_field_key,
        proposed_meaning,
        evidence,
        status,
        submitted_at
    )
    values (
        v_candidate_id,
        p_facility_id,
        p_connector_id,
        p_template_id,
        v_template_field_key,
        v_proposed_meaning,
        v_evidence,
        'submitted',
        p_submitted_at
    );

    return query
    select
        'created'::text,
        v_candidate_id;

    return;
end;
$function$;

revoke all
on function public.submit_standard_meaning_candidate(
    uuid,
    uuid,
    uuid,
    text,
    text,
    jsonb,
    timestamp with time zone
)
from public;

grant execute
on function public.submit_standard_meaning_candidate(
    uuid,
    uuid,
    uuid,
    text,
    text,
    jsonb,
    timestamp with time zone
)
to authenticated, service_role;

commit;
