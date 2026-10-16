-- RISEN CARE
-- Shared Source Template Semantic Authority core
-- with connector and RISEN admin authenticated wrappers.

begin;


create or replace function public._confirm_source_template_semantic_authority_core(
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
on function public._confirm_source_template_semantic_authority_core(
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
from public, anon, authenticated, service_role;


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

    return query
    select
        result.status,
        result.authority_id
    from public._confirm_source_template_semantic_authority_core(
        p_facility_id,
        p_connector_id,
        p_template_id,
        p_template_field_key,
        p_interpretation_status,
        p_mapping_status,
        p_confirmed_meaning,
        p_standard_entity_name,
        p_standard_field_name,
        p_confirmed_at
    ) as result;
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


create or replace function public.risen_admin_accept_standard_meaning_candidate(
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
    v_acceptance record;
    v_candidate record;
    v_meaning record;
    v_authority record;
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

    select *
    into v_acceptance
    from public.accept_standard_meaning_candidate(
        p_candidate_id,
        p_entity_name,
        p_field_name,
        p_display_name,
        p_synonyms,
        p_semantic_type
    );

    if
        v_acceptance.meaning_id is null
    then
        return query
        select
            v_acceptance.status,
            v_acceptance.meaning_id;
        return;
    end if;

    select
        c.facility_id,
        c.connector_id,
        c.template_id,
        c.template_field_key
    into v_candidate
    from public.standard_meaning_candidates as c
    where c.candidate_id =
        p_candidate_id;

    if not found then
        raise exception
            'accepted candidate metadata not found';
    end if;

    select
        m.entity_name,
        m.field_name
    into v_meaning
    from public.standard_meanings as m
    where m.meaning_id =
        v_acceptance.meaning_id;

    if not found then
        raise exception
            'accepted standard meaning not found';
    end if;

    if
        v_meaning.entity_name
            is distinct from
            nullif(
                btrim(
                    coalesce(
                        p_entity_name,
                        ''
                    )
                ),
                ''
            )
        or
        v_meaning.field_name
            is distinct from
            nullif(
                btrim(
                    coalesce(
                        p_field_name,
                        ''
                    )
                ),
                ''
            )
    then
        raise exception
            'accepted standard meaning identity mismatch';
    end if;

    select *
    into v_authority
    from public._confirm_source_template_semantic_authority_core(
        v_candidate.facility_id,
        v_candidate.connector_id,
        v_candidate.template_id,
        v_candidate.template_field_key,
        'confirmed',
        'mapped',
        v_meaning.entity_name
            || '.'
            || v_meaning.field_name,
        v_meaning.entity_name,
        v_meaning.field_name,
        now()
    );

    if
        v_authority.status
        not in (
            'created',
            'unchanged'
        )
    then
        raise exception
            'source template semantic authority failed: %',
            coalesce(
                v_authority.status,
                'unknown'
            );
    end if;

    return query
    select
        v_acceptance.status,
        v_acceptance.meaning_id;
end;
$function$;


revoke all
on function public.risen_admin_accept_standard_meaning_candidate(
    uuid,
    text,
    text,
    text,
    text[],
    text
)
from public, anon;


grant execute
on function public.risen_admin_accept_standard_meaning_candidate(
    uuid,
    text,
    text,
    text,
    text[],
    text
)
to authenticated;


commit;
