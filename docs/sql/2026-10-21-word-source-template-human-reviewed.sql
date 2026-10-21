-- ============================================================
-- RISEN CARE
-- Human-reviewed Word Source Template Registration
--
-- Word does not use exact structure fingerprint registration.
--
-- This RPC atomically:
--   1. verifies Connector trust context
--   2. verifies the exact source document snapshot
--   3. validates Word structural fields
--   4. reuses an existing identical binding when present
--   5. creates a Word source template
--   6. registers its structural fields
--   7. binds the source document snapshot as confirmed_by_human
--
-- The whole function runs in one PostgreSQL transaction.
-- ============================================================

create or replace function public.register_word_source_template_human_reviewed(
    p_facility_id uuid,
    p_connector_id uuid,
    p_source_document_key text,
    p_source_updated_at timestamp with time zone,
    p_source_size bigint,
    p_display_name text,
    p_document_type text,
    p_fields jsonb,
    p_confirmed_by_human boolean,
    p_confirmed_at timestamp with time zone
)
returns table(
    status text,
    template_id uuid,
    binding_id uuid
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_source_document_key text;
    v_display_name text;
    v_document_type text;

    v_input_count integer;
    v_existing_count integer;
    v_invalid_count integer;
    v_duplicate_key_count integer;
    v_duplicate_position_count integer;
    v_unmatched_count integer;

    v_existing_binding
        public.source_document_template_bindings%rowtype;

    v_existing_template
        public.source_templates%rowtype;

    v_template_id uuid;
    v_binding_id uuid;
begin
    -- --------------------------------------------------------
    -- Trust Boundary only
    -- --------------------------------------------------------

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

    -- --------------------------------------------------------
    -- Top-level validation
    -- --------------------------------------------------------

    if
        p_facility_id is null
        or p_connector_id is null
        or p_source_updated_at is null
        or p_source_size is null
        or p_source_size < 0
        or p_fields is null
        or jsonb_typeof(p_fields) <> 'array'
        or jsonb_array_length(p_fields) = 0
        or p_confirmed_by_human is distinct from true
        or p_confirmed_at is null
    then
        return query
        select
            'invalid'::text,
            null::uuid,
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

    if
        v_source_document_key is null
        or v_display_name is null
    then
        return query
        select
            'invalid'::text,
            null::uuid,
            null::uuid;
        return;
    end if;

    -- --------------------------------------------------------
    -- Connector must belong to this facility and be active
    -- --------------------------------------------------------

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
            null::uuid,
            null::uuid;
        return;
    end if;

    -- --------------------------------------------------------
    -- Exact source document snapshot must already exist
    -- --------------------------------------------------------

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
            null::uuid,
            null::uuid;
        return;
    end if;

    -- --------------------------------------------------------
    -- Validate Word field array
    --
    -- Generic persistence columns are used as:
    --   sheet_index = Word tableIndex
    --   ordinal     = Word rowIndex
    --
    -- Structural identity remains:
    --   word:table:<tableIndex>:row:<rowIndex>
    -- --------------------------------------------------------

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
        jsonb_typeof(item.value)
            is distinct from 'object'

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
        ) is distinct from 'number'

        or (
            item.value
                ->> 'sheet_index'
        ) !~ '^[0-9]+$'

        or jsonb_typeof(
            item.value -> 'ordinal'
        ) is distinct from 'number'

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
        ) is null

        or (
            item.value ? 'sheet_name'
            and item.value
                -> 'sheet_name'
                is distinct from
                'null'::jsonb
        );

    if v_invalid_count <> 0 then
        return query
        select
            'invalid'::text,
            null::uuid,
            null::uuid;
        return;
    end if;

    -- --------------------------------------------------------
    -- Word structural key must agree with stored positions
    -- --------------------------------------------------------

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
            'word:table:'
            || (
                item.value
                    ->> 'sheet_index'
            )
            || ':row:'
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
            null::uuid,
            null::uuid;
        return;
    end if;

    -- --------------------------------------------------------
    -- Duplicate structural keys are forbidden
    -- --------------------------------------------------------

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
            null::uuid,
            null::uuid;
        return;
    end if;

    -- --------------------------------------------------------
    -- Duplicate tableIndex / rowIndex positions are forbidden
    -- --------------------------------------------------------

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
            null::uuid,
            null::uuid;
        return;
    end if;

    -- --------------------------------------------------------
    -- Serialize registration for this exact source snapshot
    -- using the same identity as document-template binding.
    -- --------------------------------------------------------

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

    -- --------------------------------------------------------
    -- Idempotent replay:
    -- if this snapshot is already bound, it is unchanged only
    -- when the existing Word template has exactly these fields.
    -- --------------------------------------------------------

    select *
    into v_existing_binding
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
        select *
        into v_existing_template
        from public.source_templates as st
        where st.facility_id =
            p_facility_id
          and st.template_id =
            v_existing_binding.template_id
        for key share;

        if
            not found
            or v_existing_template.file_type
                is distinct from 'word'
            or v_existing_binding.match_method
                is distinct from
                'confirmed_by_human'
            or v_existing_binding.confirmed_by_human
                is distinct from true
            or v_existing_template.document_type
                is distinct from
                v_document_type
        then
            return query
            select
                'conflict'::text,
                v_existing_binding.template_id,
                v_existing_binding.id;
            return;
        end if;

        select count(*)
        into v_existing_count
        from public.source_template_fields as f
        where f.facility_id =
            p_facility_id
          and f.template_id =
            v_existing_binding.template_id;

        if v_existing_count <> v_input_count then
            return query
            select
                'conflict'::text,
                v_existing_binding.template_id,
                v_existing_binding.id;
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
                v_existing_binding.template_id

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

              and f.sheet_name is null

              and f.header_label
                    is not distinct from
                    nullif(
                        btrim(
                            coalesce(
                                input.value
                                    ->> 'header_label',
                                ''
                            )
                        ),
                        ''
                    )

              and f.normalized_header_label =
                input.value
                    ->> 'normalized_header_label'
        );

        if v_unmatched_count = 0 then
            return query
            select
                'unchanged'::text,
                v_existing_binding.template_id,
                v_existing_binding.id;
            return;
        end if;

        return query
        select
            'conflict'::text,
            v_existing_binding.template_id,
            v_existing_binding.id;
        return;
    end if;

    -- --------------------------------------------------------
    -- Create Word template.
    --
    -- Word intentionally has no exact structure fingerprint.
    -- --------------------------------------------------------

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
        'word',
        v_document_type,
        null,
        null,
        null,
        1,
        'active'
    );

    -- --------------------------------------------------------
    -- Register Word structural fields
    -- --------------------------------------------------------

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
        v_template_id,

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

        null,

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

    -- --------------------------------------------------------
    -- Human-confirmed binding
    -- --------------------------------------------------------

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
        v_template_id,
        'confirmed_by_human',
        'high',
        true,
        p_confirmed_at
    );

    return query
    select
        'created'::text,
        v_template_id,
        v_binding_id;
    return;
end;
$function$;


revoke all
on function public.register_word_source_template_human_reviewed(
    uuid,
    uuid,
    text,
    timestamp with time zone,
    bigint,
    text,
    text,
    jsonb,
    boolean,
    timestamp with time zone
)
from public;


grant execute
on function public.register_word_source_template_human_reviewed(
    uuid,
    uuid,
    text,
    timestamp with time zone,
    bigint,
    text,
    text,
    jsonb,
    boolean,
    timestamp with time zone
)
to authenticated, service_role;
