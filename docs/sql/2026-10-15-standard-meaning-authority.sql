-- RISEN CARE Standard Meaning Authority
--
-- Generic canonical dictionary for promoted Standard Meaning Candidates.
--
-- IMPORTANT:
-- - Facility / Connector cannot create canonical meanings.
-- - Promotion is service_role only.
-- - No document-specific field names are hard-coded here.
-- - Existing static catalog remains the baseline during migration.

begin;

-- ============================================================
-- 1. Canonical Standard Meanings
-- ============================================================

create table if not exists public.standard_meanings (
    meaning_id uuid
        primary key
        default gen_random_uuid(),

    entity_name text
        not null,

    field_name text
        not null,

    display_name text
        not null,

    synonyms text[]
        not null
        default '{}'::text[],

    status text
        not null
        default 'active',

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint standard_meanings_entity_name_nonblank
        check (
            nullif(
                btrim(entity_name),
                ''
            ) is not null
        ),

    constraint standard_meanings_field_name_nonblank
        check (
            nullif(
                btrim(field_name),
                ''
            ) is not null
        ),

    constraint standard_meanings_display_name_nonblank
        check (
            nullif(
                btrim(display_name),
                ''
            ) is not null
        ),

    constraint standard_meanings_status_check
        check (
            status in (
                'active',
                'retired'
            )
        ),

    constraint standard_meanings_identity_unique
        unique (
            entity_name,
            field_name
        )
);

alter table public.standard_meanings
    enable row level security;

revoke all
on public.standard_meanings
from anon, authenticated;


-- ============================================================
-- 2. Document Semantic Targets
-- ============================================================

create table if not exists public.document_semantic_targets (
    semantic_type text
        not null,

    meaning_id uuid
        not null
        references public.standard_meanings (
            meaning_id
        )
        on delete cascade,

    active boolean
        not null
        default true,

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint document_semantic_targets_type_nonblank
        check (
            nullif(
                btrim(semantic_type),
                ''
            ) is not null
        ),

    primary key (
        semantic_type,
        meaning_id
    )
);

alter table public.document_semantic_targets
    enable row level security;

revoke all
on public.document_semantic_targets
from anon, authenticated;


-- ============================================================
-- 3. Link accepted Candidate to canonical Meaning
-- ============================================================

alter table public.standard_meaning_candidates
    add column if not exists
        accepted_meaning_id uuid
        references public.standard_meanings (
            meaning_id
        );

alter table public.standard_meaning_candidates
    add column if not exists
        accepted_at timestamp with time zone;


-- ============================================================
-- 4. Read canonical dynamic meanings
-- ============================================================

create or replace function public.list_active_standard_meanings()
returns table(
    meaning_id uuid,
    entity_name text,
    field_name text,
    display_name text,
    synonyms text[]
)
language sql
security definer
set search_path to ''
stable
as $function$
    select
        m.meaning_id,
        m.entity_name,
        m.field_name,
        m.display_name,
        m.synonyms
    from public.standard_meanings as m
    where m.status = 'active'
    order by
        m.entity_name,
        m.field_name;
$function$;

revoke all
on function public.list_active_standard_meanings()
from public;

grant execute
on function public.list_active_standard_meanings()
to anon, authenticated, service_role;


-- ============================================================
-- 5. Read semantic targets for one document type
-- ============================================================

create or replace function public.list_document_semantic_targets(
    p_semantic_type text
)
returns table(
    semantic_target text
)
language sql
security definer
set search_path to ''
stable
as $function$
    select
        m.entity_name
        || '.'
        || m.field_name
    from public.document_semantic_targets as t
    join public.standard_meanings as m
      on m.meaning_id = t.meaning_id
    where
        t.semantic_type =
            nullif(
                btrim(p_semantic_type),
                ''
            )
        and t.active = true
        and m.status = 'active'
    order by
        m.entity_name,
        m.field_name;
$function$;

revoke all
on function public.list_document_semantic_targets(text)
from public;

grant execute
on function public.list_document_semantic_targets(text)
to anon, authenticated, service_role;


-- ============================================================
-- 6. RISEN-only Candidate promotion
-- ============================================================

create or replace function public.accept_standard_meaning_candidate(
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
declare
    v_candidate
        public.standard_meaning_candidates%rowtype;

    v_meaning_id uuid;

    v_entity_name text;
    v_field_name text;
    v_display_name text;
    v_semantic_type text;

    v_synonyms text[];
begin
    if
        p_candidate_id is null
        or nullif(btrim(p_entity_name), '') is null
        or nullif(btrim(p_field_name), '') is null
        or nullif(btrim(p_display_name), '') is null
        or nullif(btrim(p_semantic_type), '') is null
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    v_entity_name :=
        btrim(p_entity_name);

    v_field_name :=
        btrim(p_field_name);

    v_display_name :=
        btrim(p_display_name);

    v_semantic_type :=
        btrim(p_semantic_type);

    select *
    into v_candidate
    from public.standard_meaning_candidates
    where candidate_id = p_candidate_id
    for update;

    if not found then
        return query
        select
            'not_found'::text,
            null::uuid;
        return;
    end if;

    if
        v_candidate.status = 'accepted'
        and v_candidate.accepted_meaning_id is not null
    then
        return query
        select
            'unchanged'::text,
            v_candidate.accepted_meaning_id;
        return;
    end if;

    if v_candidate.status <> 'submitted' then
        return query
        select
            'conflict'::text,
            null::uuid;
        return;
    end if;

    select
        coalesce(
            array_agg(distinct synonym_value),
            '{}'::text[]
        )
    into v_synonyms
    from (
        select
            nullif(
                btrim(value),
                ''
            ) as synonym_value
        from unnest(
            coalesce(
                p_synonyms,
                '{}'::text[]
            )
            || array[v_display_name]
        ) as source(value)
    ) as normalized
    where synonym_value is not null;

    insert into public.standard_meanings (
        entity_name,
        field_name,
        display_name,
        synonyms,
        status
    )
    values (
        v_entity_name,
        v_field_name,
        v_display_name,
        v_synonyms,
        'active'
    )
    on conflict (
        entity_name,
        field_name
    )
    do nothing
    returning
        public.standard_meanings.meaning_id
    into v_meaning_id;

    if v_meaning_id is null then
        select
            m.meaning_id
        into v_meaning_id
        from public.standard_meanings as m
        where
            m.entity_name = v_entity_name
            and m.field_name = v_field_name;

        if v_meaning_id is null then
            raise exception
                'existing standard meaning could not be resolved';
        end if;
    end if;

    insert into public.document_semantic_targets (
        semantic_type,
        meaning_id,
        active
    )
    values (
        v_semantic_type,
        v_meaning_id,
        true
    )
    on conflict on constraint
        document_semantic_targets_pkey
    do update
    set
        active =
            true,

        updated_at =
            now();

    update public.standard_meaning_candidates
    set
        status =
            'accepted',

        accepted_meaning_id =
            v_meaning_id,

        accepted_at =
            now(),

        updated_at =
            now()
    where
        candidate_id =
            p_candidate_id;

    return query
    select
        'accepted'::text,
        v_meaning_id;
end;
$function$;

revoke all
on function public.accept_standard_meaning_candidate(
    uuid,
    text,
    text,
    text,
    text[],
    text
)
from public, anon, authenticated;

grant execute
on function public.accept_standard_meaning_candidate(
    uuid,
    text,
    text,
    text,
    text[],
    text
)
to service_role;

commit;
