-- RISEN CARE
-- Support Record Semantic Authority
--
-- Defines the semantic meanings currently supported by
-- the common Support Record execution path.
--
-- Document semantic targets:
--   user.name
--   support_record.record_date
--   support_record.record_content
--   support_record.staff_name
--   support_record.record_category
--   support_record.created_at
--
-- Projection requirements:
--   user.name
--   support_record.record_date
--   support_record.record_content
--
-- Source record identity is required.

begin;

create temporary table
risen_support_record_expected_targets (
    entity_name text not null,
    field_name text not null,
    primary key (
        entity_name,
        field_name
    )
)
on commit drop;

insert into risen_support_record_expected_targets (
    entity_name,
    field_name
)
values
    ('user', 'name'),
    ('support_record', 'record_date'),
    ('support_record', 'record_content'),
    ('support_record', 'staff_name'),
    ('support_record', 'record_category'),
    ('support_record', 'created_at');


create temporary table
risen_support_record_required_targets (
    entity_name text not null,
    field_name text not null,
    primary key (
        entity_name,
        field_name
    )
)
on commit drop;

insert into risen_support_record_required_targets (
    entity_name,
    field_name
)
values
    ('user', 'name'),
    ('support_record', 'record_date'),
    ('support_record', 'record_content');


do $guard$
declare
    v_expected_count integer;
    v_expected_resolved integer;
    v_required_count integer;
    v_required_resolved integer;
begin
    select count(*)
    into v_expected_count
    from risen_support_record_expected_targets;

    select count(*)
    into v_expected_resolved
    from risen_support_record_expected_targets as e
    join public.standard_meanings as m
      on m.entity_name = e.entity_name
     and m.field_name = e.field_name
     and m.status = 'active';

    if v_expected_count <> 6 then
        raise exception
            'support record expected target count must be 6, got %',
            v_expected_count;
    end if;

    if v_expected_resolved <> v_expected_count then
        raise exception
            'support record target resolution incomplete: expected %, resolved %',
            v_expected_count,
            v_expected_resolved;
    end if;

    select count(*)
    into v_required_count
    from risen_support_record_required_targets;

    select count(*)
    into v_required_resolved
    from risen_support_record_required_targets as e
    join public.standard_meanings as m
      on m.entity_name = e.entity_name
     and m.field_name = e.field_name
     and m.status = 'active';

    if v_required_count <> 3 then
        raise exception
            'support record required target count must be 3, got %',
            v_required_count;
    end if;

    if v_required_resolved <> v_required_count then
        raise exception
            'support record required target resolution incomplete: expected %, resolved %',
            v_required_count,
            v_required_resolved;
    end if;
end
$guard$;


insert into public.document_semantic_targets (
    semantic_type,
    meaning_id,
    active
)
select
    'support_record',
    m.meaning_id,
    true
from risen_support_record_expected_targets as e
join public.standard_meanings as m
  on m.entity_name = e.entity_name
 and m.field_name = e.field_name
 and m.status = 'active'
on conflict (
    semantic_type,
    meaning_id
)
do update
set
    active = true,
    updated_at = now();


insert into public.semantic_projection_contracts (
    semantic_type,
    source_record_identity_required,
    active
)
values (
    'support_record',
    true,
    true
)
on conflict (
    semantic_type
)
do update
set
    source_record_identity_required = true,
    active = true,
    updated_at = now();


insert into public.semantic_projection_required_meanings (
    semantic_type,
    meaning_id
)
select
    'support_record',
    m.meaning_id
from risen_support_record_required_targets as e
join public.standard_meanings as m
  on m.entity_name = e.entity_name
 and m.field_name = e.field_name
 and m.status = 'active'
on conflict (
    semantic_type,
    meaning_id
)
do nothing;


do $final_guard$
declare
    v_document_count integer;
    v_required_count integer;
    v_identity_required boolean;
begin
    select count(*)
    into v_document_count
    from public.document_semantic_targets as t
    join public.standard_meanings as m
      on m.meaning_id = t.meaning_id
    where
        t.semantic_type = 'support_record'
        and t.active = true
        and m.status = 'active';

    if v_document_count <> 6 then
        raise exception
            'support record document authority expected 6 active targets, got %',
            v_document_count;
    end if;

    select
        source_record_identity_required
    into v_identity_required
    from public.semantic_projection_contracts
    where
        semantic_type = 'support_record'
        and active = true;

    if v_identity_required is distinct from true then
        raise exception
            'support record source record identity must be required';
    end if;

    select count(*)
    into v_required_count
    from public.semantic_projection_required_meanings as r
    join public.standard_meanings as m
      on m.meaning_id = r.meaning_id
    where
        r.semantic_type = 'support_record'
        and m.status = 'active';

    if v_required_count <> 3 then
        raise exception
            'support record projection expected 3 required meanings, got %',
            v_required_count;
    end if;
end
$final_guard$;


select
    m.entity_name || '.' || m.field_name
        as document_semantic_target
from public.document_semantic_targets as t
join public.standard_meanings as m
  on m.meaning_id = t.meaning_id
where
    t.semantic_type = 'support_record'
    and t.active = true
    and m.status = 'active'
order by document_semantic_target;


select
    c.semantic_type,
    c.source_record_identity_required,
    m.entity_name || '.' || m.field_name
        as required_semantic_target
from public.semantic_projection_contracts as c
join public.semantic_projection_required_meanings as r
  on r.semantic_type = c.semantic_type
join public.standard_meanings as m
  on m.meaning_id = r.meaning_id
where
    c.semantic_type = 'support_record'
    and c.active = true
    and m.status = 'active'
order by required_semantic_target;

commit;
