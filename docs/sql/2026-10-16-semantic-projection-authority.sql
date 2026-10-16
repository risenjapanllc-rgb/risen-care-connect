-- RISEN CARE Semantic Projection Authority
--
-- Generic authority for determining:
-- - which Semantic Projections are active
-- - whether source record identity is required
-- - which canonical Standard Meanings are required
--
-- IMPORTANT:
-- - No document-specific field names are hard-coded here.
-- - Runtime execution support is separate from Semantic Projection authority.
-- - document_semantic_targets remains the authority for allowed meanings.

begin;


-- ============================================================
-- 1. Semantic Projection Contracts
-- ============================================================

create table if not exists
public.semantic_projection_contracts (
    semantic_type text
        primary key,

    source_record_identity_required boolean
        not null
        default false,

    active boolean
        not null
        default true,

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint semantic_projection_contracts_type_nonblank
        check (
            nullif(
                btrim(semantic_type),
                ''
            ) is not null
        )
);

alter table
public.semantic_projection_contracts
    enable row level security;

revoke all
on public.semantic_projection_contracts
from anon, authenticated;


-- ============================================================
-- 2. Required Meanings for one Semantic Projection
-- ============================================================

create table if not exists
public.semantic_projection_required_meanings (
    semantic_type text
        not null
        references public.semantic_projection_contracts (
            semantic_type
        )
        on delete cascade,

    meaning_id uuid
        not null
        references public.standard_meanings (
            meaning_id
        )
        on delete restrict,

    created_at timestamp with time zone
        not null
        default now(),

    primary key (
        semantic_type,
        meaning_id
    )
);

alter table
public.semantic_projection_required_meanings
    enable row level security;

revoke all
on public.semantic_projection_required_meanings
from anon, authenticated;


-- ============================================================
-- 3. Read all active Semantic Projection contracts
-- ============================================================

create or replace function
public.list_semantic_projection_contracts()
returns table(
    semantic_type text,
    source_record_identity_required boolean
)
language sql
security definer
set search_path to ''
stable
as $function$
    select
        c.semantic_type,
        c.source_record_identity_required
    from public.semantic_projection_contracts as c
    where c.active = true
    order by c.semantic_type;
$function$;

revoke all
on function
public.list_semantic_projection_contracts()
from public;

grant execute
on function
public.list_semantic_projection_contracts()
to authenticated, service_role;


-- ============================================================
-- 4. Read required canonical meanings for one Projection
-- ============================================================

create or replace function
public.list_semantic_projection_required_meanings(
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
    from public.semantic_projection_required_meanings as r
    join public.semantic_projection_contracts as c
      on c.semantic_type = r.semantic_type
    join public.standard_meanings as m
      on m.meaning_id = r.meaning_id
    where
        r.semantic_type =
            nullif(
                btrim(p_semantic_type),
                ''
            )
        and c.active = true
        and m.status = 'active'
    order by
        m.entity_name,
        m.field_name;
$function$;

revoke all
on function
public.list_semantic_projection_required_meanings(text)
from public;

grant execute
on function
public.list_semantic_projection_required_meanings(text)
to authenticated, service_role;


commit;
