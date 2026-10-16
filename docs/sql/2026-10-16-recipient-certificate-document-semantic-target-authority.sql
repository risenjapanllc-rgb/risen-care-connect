-- RISEN CARE
-- Recipient Certificate Document Semantic Target Authority
--
-- Migrates the existing 80 governed recipient-certificate
-- semantic targets from application code into
-- public.document_semantic_targets.
--
-- Existing dynamically approved targets are preserved.

begin;

create temporary table
risen_recipient_certificate_expected_targets (
    semantic_target text primary key,
    entity_name text not null,
    field_name text not null
)
on commit drop;

insert into
risen_recipient_certificate_expected_targets (
    semantic_target,
    entity_name,
    field_name
)
values
    ('user.name', 'user', 'name'),
    ('user.birth_date', 'user', 'birth_date'),
    ('user.gender', 'user', 'gender'),
    ('user.user_code', 'user', 'user_code'),
    ('user.blood_type', 'user', 'blood_type'),
    ('user.postal_code', 'user', 'postal_code'),
    ('user.address', 'user', 'address'),
    ('user.phone', 'user', 'phone'),
    ('user.mobile', 'user', 'mobile'),
    ('user.email', 'user', 'email'),
    ('user.name_kana', 'user', 'name_kana'),
    ('user.blood_rh', 'user', 'blood_rh'),
    ('user.fax', 'user', 'fax'),
    ('user.registered_domicile_postal_code', 'user', 'registered_domicile_postal_code'),
    ('user.registered_domicile', 'user', 'registered_domicile'),
    ('user.memo', 'user', 'memo'),
    ('recipient_certificate.certificate_type', 'recipient_certificate', 'certificate_type'),
    ('recipient_certificate.facility_type', 'recipient_certificate', 'facility_type'),
    ('recipient_certificate.issued_date', 'recipient_certificate', 'issued_date'),
    ('recipient_certificate.issuing_authority_name', 'recipient_certificate', 'issuing_authority_name'),
    ('recipient_certificate.valid_from', 'recipient_certificate', 'valid_from'),
    ('recipient_certificate.disability_support_level', 'recipient_certificate', 'disability_support_level'),
    ('recipient_certificate.physical_care_quantity', 'recipient_certificate', 'physical_care_quantity'),
    ('recipient_certificate.housework_assistance_quantity', 'recipient_certificate', 'housework_assistance_quantity'),
    ('recipient_certificate.outpatient_mobility_assistance_quantity', 'recipient_certificate', 'outpatient_mobility_assistance_quantity'),
    ('recipient_certificate.outpatient_physical_assistance_quantity', 'recipient_certificate', 'outpatient_physical_assistance_quantity'),
    ('recipient_certificate.daily_living_quantity', 'recipient_certificate', 'daily_living_quantity'),
    ('recipient_certificate.day_service_quantity', 'recipient_certificate', 'day_service_quantity'),
    ('recipient_certificate.day_service_ii_quantity', 'recipient_certificate', 'day_service_ii_quantity'),
    ('recipient_certificate.meal_quantity', 'recipient_certificate', 'meal_quantity'),
    ('recipient_certificate.bathing_quantity', 'recipient_certificate', 'bathing_quantity'),
    ('recipient_certificate.self_household_tier', 'recipient_certificate', 'self_household_tier'),
    ('recipient_certificate.self_copayment_amount', 'recipient_certificate', 'self_copayment_amount'),
    ('recipient_certificate.self_monthly_cap', 'recipient_certificate', 'self_monthly_cap'),
    ('recipient_certificate.supporter_household_tier', 'recipient_certificate', 'supporter_household_tier'),
    ('recipient_certificate.supporter_copayment_amount', 'recipient_certificate', 'supporter_copayment_amount'),
    ('recipient_certificate.supporter_monthly_cap', 'recipient_certificate', 'supporter_monthly_cap'),
    ('recipient_certificate.memo', 'recipient_certificate', 'memo'),
    ('recipient_certificate.same_household_multi_user_cap_management', 'recipient_certificate', 'same_household_multi_user_cap_management'),
    ('service_contract.provider_name', 'service_contract', 'provider_name'),
    ('service_contract.provider_entry_number', 'service_contract', 'provider_entry_number'),
    ('service_contract.contract_date', 'service_contract', 'contract_date'),
    ('service_contract.contract_type', 'service_contract', 'contract_type'),
    ('service_contract.service_content', 'service_contract', 'service_content'),
    ('service_contract.contracted_quantity_hours', 'service_contract', 'contracted_quantity_hours'),
    ('service_contract.contracted_quantity_days_or_times', 'service_contract', 'contracted_quantity_days_or_times'),
    ('service_contract.contracted_meal_quantity', 'service_contract', 'contracted_meal_quantity'),
    ('service_contract.contracted_bathing_quantity', 'service_contract', 'contracted_bathing_quantity'),
    ('service_contract.service_end_date', 'service_contract', 'service_end_date'),
    ('service_contract.end_classification', 'service_contract', 'end_classification'),
    ('service_delivery.provided_quantity_hours', 'service_delivery', 'provided_quantity_hours'),
    ('service_delivery.provided_quantity_days_or_times', 'service_delivery', 'provided_quantity_days_or_times'),
    ('service_delivery.provided_meal_quantity', 'service_delivery', 'provided_meal_quantity'),
    ('service_delivery.provided_bathing_quantity', 'service_delivery', 'provided_bathing_quantity'),
    ('service_entitlement.boarding_assistance_quantity', 'service_entitlement', 'boarding_assistance_quantity'),
    ('service_entitlement.behavior_support_quantity', 'service_entitlement', 'behavior_support_quantity'),
    ('service_entitlement.outing_assistance_quantity', 'service_entitlement', 'outing_assistance_quantity'),
    ('service_entitlement.outing_with_physical_care_quantity', 'service_entitlement', 'outing_with_physical_care_quantity'),
    ('service_addition.meal_addition_i', 'service_addition', 'meal_addition_i'),
    ('cost_sharing.copayment_rate_percent', 'cost_sharing', 'copayment_rate_percent'),
    ('cost_sharing.income_classification', 'cost_sharing', 'income_classification'),
    ('cost_sharing.monthly_cap', 'cost_sharing', 'monthly_cap'),
    ('cost_sharing.reduced_monthly_cap', 'cost_sharing', 'reduced_monthly_cap'),
    ('cost_sharing.social_welfare_corporation_reduction', 'cost_sharing', 'social_welfare_corporation_reduction'),
    ('upper_limit_management.expected_cap_reached_classification', 'upper_limit_management', 'expected_cap_reached_classification'),
    ('cost_sharing.relief_program_classification', 'cost_sharing', 'relief_program_classification'),
    ('cost_sharing.relief_program_cap', 'cost_sharing', 'relief_program_cap'),
    ('upper_limit_management.managing_provider', 'upper_limit_management', 'managing_provider'),
    ('service_entitlement.mutual_use', 'service_entitlement', 'mutual_use'),
    ('service_entitlement.severe_home_visit_comprehensive', 'service_entitlement', 'severe_home_visit_comprehensive'),
    ('service_entitlement.severe_home_visit_class_6', 'service_entitlement', 'severe_home_visit_class_6'),
    ('service_entitlement.severe_home_visit_other', 'service_entitlement', 'severe_home_visit_other'),
    ('service_entitlement.extremely_severe_classification', 'service_entitlement', 'extremely_severe_classification'),
    ('service_addition.meal_addition_ii', 'service_addition', 'meal_addition_ii'),
    ('recipient_certificate.legacy_law_recipient', 'recipient_certificate', 'legacy_law_recipient'),
    ('service_addition.nutrition_management_on_service_day', 'service_addition', 'nutrition_management_on_service_day'),
    ('service_entitlement.accompanying_support_primary', 'service_entitlement', 'accompanying_support_primary'),
    ('service_entitlement.accompanying_support_with_physical_care', 'service_entitlement', 'accompanying_support_with_physical_care'),
    ('recipient_certificate.certificate_number', 'recipient_certificate', 'certificate_number'),
    ('recipient_certificate.valid_until', 'recipient_certificate', 'valid_until');

do $migration_guard$
declare
    v_expected_count integer;
    v_resolved_count integer;
begin
    select count(*)
    into v_expected_count
    from risen_recipient_certificate_expected_targets;

    select count(*)
    into v_resolved_count
    from risen_recipient_certificate_expected_targets as e
    join public.standard_meanings as m
      on m.entity_name = e.entity_name
     and m.field_name = e.field_name
     and m.status = 'active';

    if v_expected_count <> 80 then
        raise exception
            'recipient certificate static authority expected 80 targets, got %',
            v_expected_count;
    end if;

    if v_resolved_count <> v_expected_count then
        raise exception
            'recipient certificate authority resolution incomplete: expected %, resolved %',
            v_expected_count,
            v_resolved_count;
    end if;
end
$migration_guard$;

insert into public.document_semantic_targets (
    semantic_type,
    meaning_id,
    active
)
select
    'recipient_certificate',
    m.meaning_id,
    true
from risen_recipient_certificate_expected_targets as e
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

do $final_guard$
declare
    v_target_count integer;
begin
    select count(*)
    into v_target_count
    from public.document_semantic_targets as t
    join public.standard_meanings as m
      on m.meaning_id = t.meaning_id
    where
        t.semantic_type = 'recipient_certificate'
        and t.active = true
        and m.status = 'active';

    if v_target_count <> 82 then
        raise exception
            'recipient certificate document target authority expected 82 active targets, got %',
            v_target_count;
    end if;
end
$final_guard$;

commit;
