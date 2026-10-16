-- RISEN CARE current Semantic Projection Contract Authority
--
-- Migrates only the projection contract that already exists
-- in semantic-projection-policy.js.
--
-- This does not migrate document-type profile requirements.

begin;


do $$
declare
    v_existing_required boolean;
begin
    select source_record_identity_required
    into v_existing_required
    from public.semantic_projection_contracts
    where semantic_type = 'recipient_certificate';

    if found then
        if v_existing_required is distinct from false then
            raise exception
                'recipient_certificate projection contract conflicts with existing authority';
        end if;
    else
        insert into public.semantic_projection_contracts (
            semantic_type,
            source_record_identity_required,
            active
        )
        values (
            'recipient_certificate',
            false,
            true
        );
    end if;
end;
$$;


do $$
declare
    v_user_name_id uuid;
    v_certificate_number_id uuid;
begin
    select meaning_id
    into v_user_name_id
    from public.standard_meanings
    where entity_name = 'user'
      and field_name = 'name'
      and status = 'active';

    if v_user_name_id is null then
        raise exception
            'Required canonical meaning user.name is missing';
    end if;


    select meaning_id
    into v_certificate_number_id
    from public.standard_meanings
    where entity_name = 'recipient_certificate'
      and field_name = 'certificate_number'
      and status = 'active';

    if v_certificate_number_id is null then
        raise exception
            'Required canonical meaning recipient_certificate.certificate_number is missing';
    end if;


    insert into public.semantic_projection_required_meanings (
        semantic_type,
        meaning_id
    )
    values
        (
            'recipient_certificate',
            v_user_name_id
        ),
        (
            'recipient_certificate',
            v_certificate_number_id
        )
    on conflict (
        semantic_type,
        meaning_id
    )
    do nothing;
end;
$$;


do $$
declare
    v_required_count integer;
begin
    select count(*)
    into v_required_count
    from public.semantic_projection_required_meanings
    where semantic_type = 'recipient_certificate';

    if v_required_count <> 2 then
        raise exception
            'recipient_certificate projection required meaning count mismatch: %',
            v_required_count;
    end if;
end;
$$;


commit;
