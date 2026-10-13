-- RISEN CARE Source Template Semantic Authority
-- Draft only. Not yet applied to production Supabase.
--
-- Purpose:
-- 1. Preserve connector/source-document provenance unchanged.
-- 2. Add reusable facility-local semantic knowledge for stable source structures.
-- 3. Bind observed source document snapshots to reusable templates.
-- 4. Keep AI/source interpretation separate from reusable semantic authority.

begin;

-- ============================================================
-- 1. Source Templates
-- ============================================================

create table public.source_templates (
    template_id uuid
        primary key
        default gen_random_uuid(),

    facility_id uuid
        not null
        references public.facilities(id),

    display_name text
        not null,

    file_type text
        not null,

    document_type text,

    structure_fingerprint text,

    canonicalization_version text,

    canonical_structure jsonb,

    template_version integer
        not null
        default 1,

    status text
        not null
        default 'active',

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint source_templates_display_name_nonblank
        check (
            nullif(
                btrim(display_name),
                ''
            ) is not null
        ),

    constraint source_templates_file_type_check
        check (
            file_type in (
                'csv',
                'excel',
                'word'
            )
        ),

    constraint source_templates_fingerprint_bundle_check
        check (
            (
                structure_fingerprint is null
                and canonicalization_version is null
                and canonical_structure is null
            )
            or
            (
                structure_fingerprint ~ '^[0-9a-f]{64}$'
                and nullif(
                    btrim(canonicalization_version),
                    ''
                ) is not null
                and jsonb_typeof(
                    canonical_structure
                ) = 'object'
            )
        ),

    constraint source_templates_fingerprint_required_check
        check (
            file_type = 'word'
            or (
                structure_fingerprint is not null
                and canonicalization_version is not null
                and canonical_structure is not null
            )
        ),

    constraint source_templates_template_version_positive
        check (
            template_version > 0
        ),

    constraint source_templates_status_check
        check (
            status in (
                'active',
                'superseded',
                'retired'
            )
        ),

    constraint source_templates_facility_template_key
        unique (
            facility_id,
            template_id
        ),

    constraint source_templates_structure_key
        unique (
            facility_id,
            canonicalization_version,
            structure_fingerprint
        )
);

-- ============================================================
-- 2. Source Template Fields
-- ============================================================

create table public.source_template_fields (
    id uuid
        primary key
        default gen_random_uuid(),

    facility_id uuid
        not null,

    template_id uuid
        not null,

    template_field_key text
        not null,

    structural_path text
        not null,

    sheet_index integer
        not null
        default 0,

    ordinal integer
        not null,

    sheet_name text,

    header_label text,

    normalized_header_label text
        not null,

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint source_template_fields_template_fk
        foreign key (
            facility_id,
            template_id
        )
        references public.source_templates (
            facility_id,
            template_id
        )
        on delete cascade,

    constraint source_template_fields_key_nonblank
        check (
            nullif(
                btrim(template_field_key),
                ''
            ) is not null
        ),

    constraint source_template_fields_structural_path_nonblank
        check (
            nullif(
                btrim(structural_path),
                ''
            ) is not null
        ),

    constraint source_template_fields_sheet_index_nonnegative
        check (
            sheet_index >= 0
        ),

    constraint source_template_fields_ordinal_nonnegative
        check (
            ordinal >= 0
        ),

    constraint source_template_fields_normalized_header_nonblank
        check (
            nullif(
                btrim(normalized_header_label),
                ''
            ) is not null
        ),

    constraint source_template_fields_identity_key
        unique (
            facility_id,
            template_id,
            template_field_key
        ),

    constraint source_template_fields_position_key
        unique (
            facility_id,
            template_id,
            sheet_index,
            ordinal
        )
);

-- ============================================================
-- 3. Source Template Semantic Mappings
-- ============================================================

create table public.source_template_semantic_mappings (
    id uuid
        primary key
        default gen_random_uuid(),

    facility_id uuid
        not null,

    template_id uuid
        not null,

    template_field_key text
        not null,

    interpretation_status text
        not null,

    mapping_status text
        not null,

    confirmed_meaning text,

    standard_entity_name text,

    standard_field_name text,

    confirmed_by_human boolean
        not null
        default true,

    confirmed_at timestamp with time zone
        not null,

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint source_template_semantic_mappings_field_fk
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

    constraint source_template_semantic_mappings_interpretation_status_check
        check (
            interpretation_status in (
                'confirmed',
                'excluded'
            )
        ),

    constraint source_template_semantic_mappings_mapping_status_check
        check (
            mapping_status in (
                'unmapped',
                'mapped',
                'no_standard_match'
            )
        ),

    constraint source_template_semantic_mappings_authority_state_check
        check (
            (
                interpretation_status = 'confirmed'
                and mapping_status in (
                    'mapped',
                    'no_standard_match'
                )
            )
            or
            (
                interpretation_status = 'excluded'
                and mapping_status = 'unmapped'
            )
        ),

    constraint source_template_semantic_mappings_standard_pair_check
        check (
            (
                mapping_status = 'mapped'
                and nullif(
                    btrim(standard_entity_name),
                    ''
                ) is not null
                and nullif(
                    btrim(standard_field_name),
                    ''
                ) is not null
            )
            or
            (
                mapping_status <> 'mapped'
                and standard_entity_name is null
                and standard_field_name is null
            )
        ),

    constraint source_template_semantic_mappings_confirmed_meaning_check
        check (
            mapping_status <> 'no_standard_match'
            or nullif(
                btrim(confirmed_meaning),
                ''
            ) is not null
        ),

    constraint source_template_semantic_mappings_human_authority_check
        check (
            confirmed_by_human = true
        ),

    constraint source_template_semantic_mappings_identity_key
        unique (
            facility_id,
            template_id,
            template_field_key
        )
);

-- ============================================================
-- 4. Source Document Template Bindings
-- ============================================================

create table public.source_document_template_bindings (
    id uuid
        primary key
        default gen_random_uuid(),

    facility_id uuid
        not null,

    connector_id uuid
        not null,

    source_document_key text
        not null,

    source_updated_at timestamp with time zone
        not null,

    source_size bigint
        not null,

    template_id uuid
        not null,

    match_method text
        not null,

    match_confidence text,

    confirmed_by_human boolean
        not null
        default false,

    confirmed_at timestamp with time zone,

    created_at timestamp with time zone
        not null
        default now(),

    updated_at timestamp with time zone
        not null
        default now(),

    constraint source_document_template_bindings_source_document_fk
        foreign key (
            facility_id,
            connector_id,
            source_document_key
        )
        references public.connector_source_documents (
            facility_id,
            connector_id,
            source_document_key
        )
        on delete cascade,

    constraint source_document_template_bindings_template_fk
        foreign key (
            facility_id,
            template_id
        )
        references public.source_templates (
            facility_id,
            template_id
        ),

    constraint source_document_template_bindings_document_key_nonblank
        check (
            nullif(
                btrim(source_document_key),
                ''
            ) is not null
        ),

    constraint source_document_template_bindings_source_size_nonnegative
        check (
            source_size >= 0
        ),

    constraint source_document_template_bindings_match_method_check
        check (
            match_method in (
                'exact_structure_fingerprint',
                'confirmed_by_human'
            )
        ),

    constraint source_document_template_bindings_confidence_check
        check (
            match_confidence is null
            or match_confidence in (
                'high',
                'medium',
                'low'
            )
        ),

    constraint source_document_template_bindings_confirmation_check
        check (
            (
                confirmed_by_human = true
                and confirmed_at is not null
            )
            or
            (
                confirmed_by_human = false
                and confirmed_at is null
            )
        ),

    constraint source_document_template_bindings_match_confirmation_check
        check (
            match_method <> 'confirmed_by_human'
            or confirmed_by_human = true
        ),

    constraint source_document_template_bindings_snapshot_key
        unique (
            facility_id,
            connector_id,
            source_document_key,
            source_updated_at,
            source_size
        )
);

-- ============================================================
-- 5. Exact Source Template Registration RPC
-- ============================================================

create or replace function public.get_or_create_source_template_exact(
    p_facility_id uuid,
    p_connector_id uuid,
    p_display_name text,
    p_file_type text,
    p_document_type text,
    p_structure_fingerprint text,
    p_canonicalization_version text,
    p_canonical_structure jsonb
)
returns table(
    status text,
    template_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_existing public.source_templates%rowtype;
    v_template_id uuid;
    v_display_name text;
    v_file_type text;
    v_document_type text;
    v_canonicalization_version text;
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
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    v_display_name :=
        nullif(
            btrim(
                coalesce(
                    p_display_name,
                    ''
                )
            ),
            ''
        );

    v_file_type :=
        nullif(
            btrim(
                lower(
                    coalesce(
                        p_file_type,
                        ''
                    )
                )
            ),
            ''
        );

    v_document_type :=
        nullif(
            btrim(
                coalesce(
                    p_document_type,
                    ''
                )
            ),
            ''
        );

    v_canonicalization_version :=
        nullif(
            btrim(
                coalesce(
                    p_canonicalization_version,
                    ''
                )
            ),
            ''
        );

    if
        v_display_name is null
        or v_file_type not in (
            'csv',
            'excel'
        )
        or p_structure_fingerprint is null
        or p_structure_fingerprint
            !~ '^[0-9a-f]{64}$'
        or v_canonicalization_version is null
        or p_canonical_structure is null
        or jsonb_typeof(
            p_canonical_structure
        ) <> 'object'
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
            || v_canonicalization_version
            || E'\x1f'
            || p_structure_fingerprint,
            0
        )
    );

    select *
    into v_existing
    from public.source_templates as st
    where st.facility_id =
        p_facility_id
      and st.canonicalization_version =
        v_canonicalization_version
      and st.structure_fingerprint =
        p_structure_fingerprint
    for update;

    if found then
        if
            v_existing.file_type =
                v_file_type
            and v_existing.canonical_structure =
                p_canonical_structure
            and v_existing.document_type
                is not distinct from
                v_document_type
        then
            return query
            select
                'unchanged'::text,
                v_existing.template_id;
            return;
        end if;

        return query
        select
            'conflict'::text,
            v_existing.template_id;
        return;
    end if;

    v_template_id :=
        gen_random_uuid();

    insert into public.source_templates (
        template_id,
        facility_id,
        display_name,
        file_type,
        document_type,
        structure_fingerprint,
        canonicalization_version,
        canonical_structure,
        template_version,
        status
    )
    values (
        v_template_id,
        p_facility_id,
        v_display_name,
        v_file_type,
        v_document_type,
        p_structure_fingerprint,
        v_canonicalization_version,
        p_canonical_structure,
        1,
        'active'
    );

    return query
    select
        'created'::text,
        v_template_id;
    return;
end;
$function$;

revoke all
on function public.get_or_create_source_template_exact(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    jsonb
)
from public;

grant execute
on function public.get_or_create_source_template_exact(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    jsonb
)
to authenticated, service_role;

-- ============================================================
-- 6. Exact Source Template Field Registration RPC
-- ============================================================

create or replace function public.register_source_template_fields_exact(
    p_facility_id uuid,
    p_connector_id uuid,
    p_template_id uuid,
    p_fields jsonb
)
returns table(
    status text,
    template_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_template public.source_templates%rowtype;
    v_input_count integer;
    v_existing_count integer;
    v_canonical_count integer;
    v_invalid_count integer;
    v_duplicate_key_count integer;
    v_duplicate_position_count integer;
    v_unmatched_count integer;
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
        or p_fields is null
        or jsonb_typeof(p_fields) <> 'array'
        or jsonb_array_length(p_fields) = 0
    then
        return query
        select
            'invalid'::text,
            p_template_id;
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
            p_template_id;
        return;
    end if;

    select *
    into v_template
    from public.source_templates as st
    where st.facility_id =
        p_facility_id
      and st.template_id =
        p_template_id
    for key share;

    if not found then
        return query
        select
            'denied'::text,
            p_template_id;
        return;
    end if;

    if
        v_template.file_type not in (
            'csv',
            'excel'
        )
        or v_template.structure_fingerprint is null
        or v_template.canonicalization_version is null
        or v_template.canonical_structure is null
        or jsonb_typeof(
            v_template.canonical_structure
        ) <> 'object'
    then
        return query
        select
            'invalid'::text,
            p_template_id;
        return;
    end if;

    select count(*)
    into v_input_count
    from jsonb_array_elements(
        p_fields
    );

    select count(*)
    into v_invalid_count
    from jsonb_array_elements(
        p_fields
    ) as item(value)
    where
        jsonb_typeof(item.value) <> 'object'

        or nullif(
            btrim(
                coalesce(
                    item.value
                        ->> 'template_field_key',
                    ''
                )
            ),
            ''
        ) is null

        or nullif(
            btrim(
                coalesce(
                    item.value
                        ->> 'structural_path',
                    ''
                )
            ),
            ''
        ) is null

        or jsonb_typeof(
            item.value -> 'sheet_index'
        ) <> 'number'

        or (
            item.value
                ->> 'sheet_index'
        ) !~ '^[0-9]+$'

        or jsonb_typeof(
            item.value -> 'ordinal'
        ) <> 'number'

        or (
            item.value
                ->> 'ordinal'
        ) !~ '^[0-9]+$'

        or nullif(
            btrim(
                coalesce(
                    item.value
                        ->> 'normalized_header_label',
                    ''
                )
            ),
            ''
        ) is null;

    if v_invalid_count <> 0 then
        return query
        select
            'invalid'::text,
            p_template_id;
        return;
    end if;

    select count(*)
    into v_invalid_count
    from jsonb_array_elements(
        p_fields
    ) as item(value)
    where
        item.value
            ->> 'template_field_key'
        <>
        (
            'sheet:'
            || (
                item.value
                    ->> 'sheet_index'
            )
            || ':column:'
            || (
                item.value
                    ->> 'ordinal'
            )
        )

        or item.value
            ->> 'structural_path'
        <>
        item.value
            ->> 'template_field_key';

    if v_invalid_count <> 0 then
        return query
        select
            'invalid'::text,
            p_template_id;
        return;
    end if;

    select count(*)
    into v_duplicate_key_count
    from (
        select
            item.value
                ->> 'template_field_key'
                as template_field_key
        from jsonb_array_elements(
            p_fields
        ) as item(value)
        group by
            item.value
                ->> 'template_field_key'
        having count(*) > 1
    ) as duplicates;

    if v_duplicate_key_count <> 0 then
        return query
        select
            'invalid'::text,
            p_template_id;
        return;
    end if;

    select count(*)
    into v_duplicate_position_count
    from (
        select
            (
                item.value
                    ->> 'sheet_index'
            )::integer as sheet_index,
            (
                item.value
                    ->> 'ordinal'
            )::integer as ordinal
        from jsonb_array_elements(
            p_fields
        ) as item(value)
        group by
            (
                item.value
                    ->> 'sheet_index'
            )::integer,
            (
                item.value
                    ->> 'ordinal'
            )::integer
        having count(*) > 1
    ) as duplicates;

    if v_duplicate_position_count <> 0 then
        return query
        select
            'invalid'::text,
            p_template_id;
        return;
    end if;

    if v_template.file_type = 'csv' then
        if
            v_template.canonical_structure
                ->> 'type'
                is distinct from 'csv'
            or jsonb_typeof(
                v_template.canonical_structure
                    -> 'fields'
            ) <> 'array'
        then
            return query
            select
                'conflict'::text,
                p_template_id;
            return;
        end if;

        select jsonb_array_length(
            v_template.canonical_structure
                -> 'fields'
        )
        into v_canonical_count;

        if v_canonical_count <> v_input_count then
            return query
            select
                'conflict'::text,
                p_template_id;
            return;
        end if;

        select count(*)
        into v_unmatched_count
        from jsonb_array_elements(
            p_fields
        ) as input(value)
        where
            (
                input.value
                    ->> 'sheet_index'
            )::integer <> 0

            or (
                input.value ? 'sheet_name'
                and input.value
                    -> 'sheet_name'
                    is distinct from 'null'::jsonb
            )

            or not exists (
                select 1
                from jsonb_array_elements(
                    v_template.canonical_structure
                        -> 'fields'
                ) as canonical(value)
                where (
                    canonical.value
                        ->> 'columnIndex'
                )::integer =
                    (
                        input.value
                            ->> 'ordinal'
                    )::integer
                  and canonical.value
                        ->> 'headerLabel'
                    =
                    input.value
                        ->> 'normalized_header_label'
            );

        if v_unmatched_count <> 0 then
            return query
            select
                'conflict'::text,
                p_template_id;
            return;
        end if;

    else
        if
            v_template.canonical_structure
                ->> 'type'
                is distinct from 'excel'
            or jsonb_typeof(
                v_template.canonical_structure
                    -> 'sheets'
            ) <> 'array'
        then
            return query
            select
                'conflict'::text,
                p_template_id;
            return;
        end if;

        select count(*)
        into v_canonical_count
        from jsonb_array_elements(
            v_template.canonical_structure
                -> 'sheets'
        ) as sheet(value)
        cross join lateral
            jsonb_array_elements(
                sheet.value
                    -> 'fields'
            ) as field(value);

        if v_canonical_count <> v_input_count then
            return query
            select
                'conflict'::text,
                p_template_id;
            return;
        end if;

        select count(*)
        into v_unmatched_count
        from jsonb_array_elements(
            p_fields
        ) as input(value)
        where not exists (
            select 1
            from jsonb_array_elements(
                v_template.canonical_structure
                    -> 'sheets'
            ) as sheet(value)
            cross join lateral
                jsonb_array_elements(
                    sheet.value
                        -> 'fields'
                ) as field(value)
            where (
                sheet.value
                    ->> 'sheetIndex'
            )::integer =
                (
                    input.value
                        ->> 'sheet_index'
                )::integer
              and sheet.value
                    ->> 'sheetName'
                =
                input.value
                    ->> 'sheet_name'
              and (
                    field.value
                        ->> 'columnIndex'
                )::integer =
                (
                    input.value
                        ->> 'ordinal'
                )::integer
              and field.value
                    ->> 'headerLabel'
                =
                input.value
                    ->> 'normalized_header_label'
        );

        if v_unmatched_count <> 0 then
            return query
            select
                'conflict'::text,
                p_template_id;
            return;
        end if;
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(
            p_facility_id::text
            || E'\x1f'
            || p_template_id::text
            || E'\x1f'
            || 'source_template_fields',
            0
        )
    );

    select count(*)
    into v_existing_count
    from public.source_template_fields as f
    where f.facility_id =
        p_facility_id
      and f.template_id =
        p_template_id;

    if v_existing_count <> 0 then
        if v_existing_count <> v_input_count then
            return query
            select
                'conflict'::text,
                p_template_id;
            return;
        end if;

        select count(*)
        into v_unmatched_count
        from jsonb_array_elements(
            p_fields
        ) as input(value)
        where not exists (
            select 1
            from public.source_template_fields as f
            where f.facility_id =
                p_facility_id
              and f.template_id =
                p_template_id
              and f.template_field_key =
                input.value
                    ->> 'template_field_key'
              and f.structural_path =
                input.value
                    ->> 'structural_path'
              and f.sheet_index =
                (
                    input.value
                        ->> 'sheet_index'
                )::integer
              and f.ordinal =
                (
                    input.value
                        ->> 'ordinal'
                )::integer
              and f.sheet_name
                    is not distinct from
                    (
                        input.value
                            ->> 'sheet_name'
                    )
              and f.normalized_header_label =
                input.value
                    ->> 'normalized_header_label'
        );

        if v_unmatched_count = 0 then
            return query
            select
                'unchanged'::text,
                p_template_id;
            return;
        end if;

        return query
        select
            'conflict'::text,
            p_template_id;
        return;
    end if;

    insert into public.source_template_fields (
        facility_id,
        template_id,
        template_field_key,
        structural_path,
        sheet_index,
        ordinal,
        sheet_name,
        header_label,
        normalized_header_label
    )
    select
        p_facility_id,
        p_template_id,
        input.value
            ->> 'template_field_key',
        input.value
            ->> 'structural_path',
        (
            input.value
                ->> 'sheet_index'
        )::integer,
        (
            input.value
                ->> 'ordinal'
        )::integer,
        case
            when v_template.file_type = 'csv'
                then null
            else input.value
                ->> 'sheet_name'
        end,
        nullif(
            btrim(
                coalesce(
                    input.value
                        ->> 'header_label',
                    ''
                )
            ),
            ''
        ),
        input.value
            ->> 'normalized_header_label'
    from jsonb_array_elements(
        p_fields
    ) as input(value);

    return query
    select
        'created'::text,
        p_template_id;
    return;
end;
$function$;

revoke all
on function public.register_source_template_fields_exact(
    uuid,
    uuid,
    uuid,
    jsonb
)
from public;

grant execute
on function public.register_source_template_fields_exact(
    uuid,
    uuid,
    uuid,
    jsonb
)
to authenticated, service_role;

-- ============================================================
-- 7. Template Semantic Authority Confirmation RPC
-- ============================================================

create or replace function public.confirm_source_template_semantic_authority(
    p_facility_id uuid,
    p_connector_id uuid,
    p_template_id uuid,
    p_template_field_key text,
    p_interpretation_status text,
    p_mapping_status text,
    p_confirmed_meaning text,
    p_standard_entity_name text,
    p_standard_field_name text,
    p_confirmed_at timestamp with time zone
)
returns table(
    status text,
    authority_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_template_field_key text;
    v_interpretation_status text;
    v_mapping_status text;
    v_confirmed_meaning text;
    v_standard_entity_name text;
    v_standard_field_name text;

    v_existing
        public.source_template_semantic_mappings%rowtype;

    v_authority_id uuid;
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
        or p_confirmed_at is null
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

    v_interpretation_status :=
        nullif(
            btrim(
                lower(
                    coalesce(
                        p_interpretation_status,
                        ''
                    )
                )
            ),
            ''
        );

    v_mapping_status :=
        nullif(
            btrim(
                lower(
                    coalesce(
                        p_mapping_status,
                        ''
                    )
                )
            ),
            ''
        );

    v_confirmed_meaning :=
        nullif(
            btrim(
                coalesce(
                    p_confirmed_meaning,
                    ''
                )
            ),
            ''
        );

    v_standard_entity_name :=
        nullif(
            btrim(
                coalesce(
                    p_standard_entity_name,
                    ''
                )
            ),
            ''
        );

    v_standard_field_name :=
        nullif(
            btrim(
                coalesce(
                    p_standard_field_name,
                    ''
                )
            ),
            ''
        );

    if v_template_field_key is null then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    if not (
        (
            v_interpretation_status = 'confirmed'
            and v_mapping_status = 'mapped'
            and v_standard_entity_name is not null
            and v_standard_field_name is not null
        )
        or
        (
            v_interpretation_status = 'confirmed'
            and v_mapping_status = 'no_standard_match'
            and v_confirmed_meaning is not null
            and v_standard_entity_name is null
            and v_standard_field_name is null
        )
        or
        (
            v_interpretation_status = 'excluded'
            and v_mapping_status = 'unmapped'
            and v_standard_entity_name is null
            and v_standard_field_name is null
        )
    ) then
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
            || 'template_semantic_authority',
            0
        )
    );

    select *
    into v_existing
    from public.source_template_semantic_mappings as m
    where m.facility_id =
        p_facility_id
      and m.template_id =
        p_template_id
      and m.template_field_key =
        v_template_field_key
    for update;

    if found then
        if
            v_existing.interpretation_status =
                v_interpretation_status
            and v_existing.mapping_status =
                v_mapping_status
            and v_existing.confirmed_meaning
                is not distinct from
                v_confirmed_meaning
            and v_existing.standard_entity_name
                is not distinct from
                v_standard_entity_name
            and v_existing.standard_field_name
                is not distinct from
                v_standard_field_name
            and v_existing.confirmed_by_human = true
        then
            return query
            select
                'unchanged'::text,
                v_existing.id;
            return;
        end if;

        return query
        select
            'conflict'::text,
            v_existing.id;
        return;
    end if;

    v_authority_id :=
        gen_random_uuid();

    insert into public.source_template_semantic_mappings (
        id,
        facility_id,
        template_id,
        template_field_key,
        interpretation_status,
        mapping_status,
        confirmed_meaning,
        standard_entity_name,
        standard_field_name,
        confirmed_by_human,
        confirmed_at
    )
    values (
        v_authority_id,
        p_facility_id,
        p_template_id,
        v_template_field_key,
        v_interpretation_status,
        v_mapping_status,
        v_confirmed_meaning,
        v_standard_entity_name,
        v_standard_field_name,
        true,
        p_confirmed_at
    );

    return query
    select
        'created'::text,
        v_authority_id;
    return;
end;
$function$;

revoke all
on function public.confirm_source_template_semantic_authority(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    timestamp with time zone
)
from public;

grant execute
on function public.confirm_source_template_semantic_authority(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    timestamp with time zone
)
to authenticated, service_role;

-- ============================================================
-- 8. Source Document Template Binding RPC
-- ============================================================

create or replace function public.bind_source_document_template(
    p_facility_id uuid,
    p_connector_id uuid,
    p_source_document_key text,
    p_source_updated_at timestamp with time zone,
    p_source_size bigint,
    p_template_id uuid,
    p_match_method text,
    p_match_confidence text,
    p_confirmed_by_human boolean,
    p_confirmed_at timestamp with time zone
)
returns table(
    status text,
    binding_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_source_document_key text;
    v_match_method text;
    v_match_confidence text;

    v_template
        public.source_templates%rowtype;

    v_existing
        public.source_document_template_bindings%rowtype;

    v_binding_id uuid;
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
        or p_source_updated_at is null
        or p_source_size is null
        or p_source_size < 0
        or p_template_id is null
        or p_confirmed_by_human is null
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    v_source_document_key :=
        nullif(
            btrim(
                coalesce(
                    p_source_document_key,
                    ''
                )
            ),
            ''
        );

    v_match_method :=
        nullif(
            btrim(
                lower(
                    coalesce(
                        p_match_method,
                        ''
                    )
                )
            ),
            ''
        );

    v_match_confidence :=
        nullif(
            btrim(
                lower(
                    coalesce(
                        p_match_confidence,
                        ''
                    )
                )
            ),
            ''
        );

    if
        v_source_document_key is null
        or v_match_method not in (
            'exact_structure_fingerprint',
            'confirmed_by_human'
        )
        or (
            v_match_confidence is not null
            and v_match_confidence not in (
                'high',
                'medium',
                'low'
            )
        )
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    if (
        p_confirmed_by_human = true
        and p_confirmed_at is null
    )
    or (
        p_confirmed_by_human = false
        and p_confirmed_at is not null
    )
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    if
        v_match_method = 'confirmed_by_human'
        and p_confirmed_by_human is distinct from true
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
    from public.connector_source_documents as d
    where d.facility_id =
        p_facility_id
      and d.connector_id =
        p_connector_id
      and d.source_document_key =
        v_source_document_key
      and d.source_updated_at =
        p_source_updated_at
      and d.source_size =
        p_source_size
    for key share;

    if not found then
        return query
        select
            'denied'::text,
            null::uuid;
        return;
    end if;

    select *
    into v_template
    from public.source_templates as t
    where t.facility_id =
        p_facility_id
      and t.template_id =
        p_template_id
    for key share;

    if not found then
        return query
        select
            'denied'::text,
            null::uuid;
        return;
    end if;

    if
        v_match_method =
            'exact_structure_fingerprint'
        and v_template.structure_fingerprint
            is null
    then
        return query
        select
            'invalid'::text,
            null::uuid;
        return;
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(
            p_facility_id::text
            || E'\x1f'
            || p_connector_id::text
            || E'\x1f'
            || v_source_document_key
            || E'\x1f'
            || extract(
                epoch from p_source_updated_at
            )::text
            || E'\x1f'
            || p_source_size::text
            || E'\x1f'
            || 'source_document_template_binding',
            0
        )
    );

    select *
    into v_existing
    from public.source_document_template_bindings
        as b
    where b.facility_id =
        p_facility_id
      and b.connector_id =
        p_connector_id
      and b.source_document_key =
        v_source_document_key
      and b.source_updated_at =
        p_source_updated_at
      and b.source_size =
        p_source_size
    for update;

    if found then
        if
            v_existing.template_id =
                p_template_id
            and v_existing.match_method =
                v_match_method
            and v_existing.match_confidence
                is not distinct from
                v_match_confidence
            and v_existing.confirmed_by_human =
                p_confirmed_by_human
        then
            return query
            select
                'unchanged'::text,
                v_existing.id;
            return;
        end if;

        return query
        select
            'conflict'::text,
            v_existing.id;
        return;
    end if;

    v_binding_id :=
        gen_random_uuid();

    insert into public.source_document_template_bindings (
        id,
        facility_id,
        connector_id,
        source_document_key,
        source_updated_at,
        source_size,
        template_id,
        match_method,
        match_confidence,
        confirmed_by_human,
        confirmed_at
    )
    values (
        v_binding_id,
        p_facility_id,
        p_connector_id,
        v_source_document_key,
        p_source_updated_at,
        p_source_size,
        p_template_id,
        v_match_method,
        v_match_confidence,
        p_confirmed_by_human,
        p_confirmed_at
    );

    return query
    select
        'created'::text,
        v_binding_id;
    return;
end;
$function$;

revoke all
on function public.bind_source_document_template(
    uuid,
    uuid,
    text,
    timestamp with time zone,
    bigint,
    uuid,
    text,
    text,
    boolean,
    timestamp with time zone
)
from public;

grant execute
on function public.bind_source_document_template(
    uuid,
    uuid,
    text,
    timestamp with time zone,
    bigint,
    uuid,
    text,
    text,
    boolean,
    timestamp with time zone
)
to authenticated, service_role;

-- ============================================================
-- RLS
-- ============================================================

alter table public.source_templates
    enable row level security;

alter table public.source_template_fields
    enable row level security;

alter table public.source_template_semantic_mappings
    enable row level security;

alter table public.source_document_template_bindings
    enable row level security;

commit;
