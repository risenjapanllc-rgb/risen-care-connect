-- ============================================================
-- RISEN CARE Standard Meaning Taxonomy Authority
--
-- Purpose:
-- - Keep business taxonomy separate from semanticType.
-- - Keep Meaning ID stable when taxonomy changes.
-- - Allow one active taxonomy category per Meaning.
-- - Preserve taxonomy change history.
-- - Authority changes are service_role only.
-- ============================================================

begin;


-- ============================================================
-- 1. Taxonomy Categories
-- ============================================================

create table if not exists
public.semantic_taxonomy_categories (
    category_id uuid
        primary key
        default gen_random_uuid(),

    category_key text
        not null,

    display_name text
        not null,

    description text,

    status text
        not null
        default 'active',

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint
        semantic_taxonomy_categories_key_nonblank
        check (
            nullif(
                btrim(category_key),
                ''
            ) is not null
        ),

    constraint
        semantic_taxonomy_categories_display_name_nonblank
        check (
            nullif(
                btrim(display_name),
                ''
            ) is not null
        ),

    constraint
        semantic_taxonomy_categories_status_check
        check (
            status in (
                'active',
                'retired'
            )
        ),

    constraint
        semantic_taxonomy_categories_key_unique
        unique (
            category_key
        )
);

alter table
public.semantic_taxonomy_categories
enable row level security;

revoke all
on public.semantic_taxonomy_categories
from anon, authenticated;


-- ============================================================
-- 2. Current Meaning -> Taxonomy membership
-- ============================================================

create table if not exists
public.standard_meaning_taxonomy_memberships (
    meaning_id uuid
        not null
        references public.standard_meanings (
            meaning_id
        )
        on delete cascade,

    category_id uuid
        not null
        references public.semantic_taxonomy_categories (
            category_id
        ),

    active boolean
        not null
        default true,

    assigned_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    primary key (
        meaning_id,
        category_id
    )
);

create unique index if not exists
standard_meaning_taxonomy_one_active_category_idx
on public.standard_meaning_taxonomy_memberships (
    meaning_id
)
where active = true;

create index if not exists
standard_meaning_taxonomy_category_idx
on public.standard_meaning_taxonomy_memberships (
    category_id
)
where active = true;

alter table
public.standard_meaning_taxonomy_memberships
enable row level security;

revoke all
on public.standard_meaning_taxonomy_memberships
from anon, authenticated;


-- ============================================================
-- 3. Taxonomy revision history
-- ============================================================

create table if not exists
public.standard_meaning_taxonomy_revisions (
    revision_id uuid
        primary key
        default gen_random_uuid(),

    meaning_id uuid
        not null
        references public.standard_meanings (
            meaning_id
        )
        on delete cascade,

    revision_no integer
        not null
        check (
            revision_no >= 1
        ),

    previous_category_id uuid
        references public.semantic_taxonomy_categories (
            category_id
        ),

    new_category_id uuid
        references public.semantic_taxonomy_categories (
            category_id
        ),

    revision_reason text,

    revised_by text,

    revised_by_name text,

    revised_at timestamptz
        not null
        default now(),

    constraint
        standard_meaning_taxonomy_revision_change_check
        check (
            previous_category_id is distinct from
            new_category_id
        ),

    constraint
        standard_meaning_taxonomy_revision_unique
        unique (
            meaning_id,
            revision_no
        )
);

create index if not exists
standard_meaning_taxonomy_revisions_meaning_idx
on public.standard_meaning_taxonomy_revisions (
    meaning_id,
    revision_no
);

alter table
public.standard_meaning_taxonomy_revisions
enable row level security;

revoke all
on public.standard_meaning_taxonomy_revisions
from anon, authenticated;


-- ============================================================
-- 4. Initial taxonomy categories
--
-- These are business classifications.
-- They are NOT semanticType execution contracts.
-- ============================================================

insert into public.semantic_taxonomy_categories (
    category_key,
    display_name,
    description
)
values
    (
        'facility',
        '施設',
        '施設・法人・事業所に関するMeaning'
    ),
    (
        'staff',
        '職員',
        '職員・所属・資格・勤務に関するMeaning'
    ),
    (
        'user',
        '利用者',
        '利用者基本情報・家族等に関するMeaning'
    ),
    (
        'daily_record',
        '日常記録',
        '日誌・支援記録・状態・出来事・観察・行動に関するMeaning'
    ),
    (
        'support_plan',
        '支援計画・評価',
        '個別支援計画・アセスメント・モニタリング・評価に関するMeaning'
    ),
    (
        'billing_contract',
        '請求・契約',
        '契約・利用実績・加算・請求・利用者負担に関するMeaning'
    ),
    (
        'operation_management',
        '運営・管理',
        '会議・委員会・研修・事故・苦情・監査・BCPに関するMeaning'
    )
on conflict (
    category_key
)
do nothing;


-- ============================================================
-- 5. Read active taxonomy categories
-- ============================================================

create or replace function
public.list_semantic_taxonomy_categories()
returns table(
    category_id uuid,
    category_key text,
    display_name text,
    description text
)
language sql
security definer
set search_path to ''
stable
as $function$
    select
        c.category_id,
        c.category_key,
        c.display_name,
        c.description
    from public.semantic_taxonomy_categories as c
    where c.status = 'active'
    order by
        c.category_key;
$function$;

revoke all
on function
public.list_semantic_taxonomy_categories()
from public;

grant execute
on function
public.list_semantic_taxonomy_categories()
to authenticated, service_role;


-- ============================================================
-- 6. Read current Meaning taxonomy membership
-- ============================================================

create or replace function
public.list_standard_meaning_taxonomy_memberships()
returns table(
    meaning_id uuid,
    category_id uuid,
    category_key text,
    category_display_name text
)
language sql
security definer
set search_path to ''
stable
as $function$
    select
        membership.meaning_id,
        category.category_id,
        category.category_key,
        category.display_name
    from
        public.standard_meaning_taxonomy_memberships
            as membership
    join
        public.semantic_taxonomy_categories
            as category
        on category.category_id =
            membership.category_id
    where
        membership.active = true
        and category.status = 'active'
    order by
        membership.meaning_id;
$function$;

revoke all
on function
public.list_standard_meaning_taxonomy_memberships()
from public;

grant execute
on function
public.list_standard_meaning_taxonomy_memberships()
to authenticated, service_role;


-- ============================================================
-- 7. RISEN-only taxonomy assignment / move
-- ============================================================

create or replace function
public.assign_standard_meaning_taxonomy_category(
    p_meaning_id uuid,
    p_category_key text,
    p_revision_reason text default null,
    p_revised_by text default null,
    p_revised_by_name text default null
)
returns table(
    status text,
    meaning_id uuid,
    category_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_category_id uuid;
    v_previous_category_id uuid;
    v_revision_no integer;
begin
    if
        p_meaning_id is null
        or nullif(
            btrim(p_category_key),
            ''
        ) is null
    then
        return query
        select
            'invalid'::text,
            null::uuid,
            null::uuid;
        return;
    end if;

    perform 1
    from public.standard_meanings
    where standard_meanings.meaning_id =
        p_meaning_id
      and standard_meanings.status =
        'active'
    for update;

    if not found then
        return query
        select
            'meaning_not_found'::text,
            null::uuid,
            null::uuid;
        return;
    end if;

    select
        category.category_id
    into
        v_category_id
    from public.semantic_taxonomy_categories
        as category
    where
        category.category_key =
            btrim(p_category_key)
        and category.status =
            'active';

    if v_category_id is null then
        return query
        select
            'category_not_found'::text,
            p_meaning_id,
            null::uuid;
        return;
    end if;

    select
        membership.category_id
    into
        v_previous_category_id
    from
        public.standard_meaning_taxonomy_memberships
            as membership
    where
        membership.meaning_id =
            p_meaning_id
        and membership.active = true
    for update;

    if
        v_previous_category_id =
        v_category_id
    then
        return query
        select
            'unchanged'::text,
            p_meaning_id,
            v_category_id;
        return;
    end if;

    update
        public.standard_meaning_taxonomy_memberships
    set
        active =
            false,
        updated_at =
            now()
    where
        standard_meaning_taxonomy_memberships.meaning_id =
            p_meaning_id
        and standard_meaning_taxonomy_memberships.active =
            true;

    insert into
        public.standard_meaning_taxonomy_memberships (
            meaning_id,
            category_id,
            active,
            assigned_at,
            updated_at
        )
    values (
        p_meaning_id,
        v_category_id,
        true,
        now(),
        now()
    )
    on conflict on constraint
        standard_meaning_taxonomy_memberships_pkey
    do update
    set
        active =
            true,
        assigned_at =
            now(),
        updated_at =
            now();

    select
        coalesce(
            max(revision.revision_no),
            0
        ) + 1
    into
        v_revision_no
    from
        public.standard_meaning_taxonomy_revisions
            as revision
    where
        revision.meaning_id =
            p_meaning_id;

    insert into
        public.standard_meaning_taxonomy_revisions (
            meaning_id,
            revision_no,
            previous_category_id,
            new_category_id,
            revision_reason,
            revised_by,
            revised_by_name,
            revised_at
        )
    values (
        p_meaning_id,
        v_revision_no,
        v_previous_category_id,
        v_category_id,
        nullif(
            btrim(
                coalesce(
                    p_revision_reason,
                    ''
                )
            ),
            ''
        ),
        nullif(
            btrim(
                coalesce(
                    p_revised_by,
                    ''
                )
            ),
            ''
        ),
        nullif(
            btrim(
                coalesce(
                    p_revised_by_name,
                    ''
                )
            ),
            ''
        ),
        now()
    );

    return query
    select
        'assigned'::text,
        p_meaning_id,
        v_category_id;
end;
$function$;

revoke all
on function
public.assign_standard_meaning_taxonomy_category(
    uuid,
    text,
    text,
    text,
    text
)
from public, anon, authenticated;

grant execute
on function
public.assign_standard_meaning_taxonomy_category(
    uuid,
    text,
    text,
    text,
    text
)
to service_role;


commit;
