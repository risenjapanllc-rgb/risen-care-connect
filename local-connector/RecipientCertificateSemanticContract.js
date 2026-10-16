"use strict";

const SUPPORTED_SEMANTIC_TARGETS =
    new Set([
        "user.name",
        "user.birth_date",
        "user.gender",
        "user.user_code",
        "user.blood_type",
        "user.postal_code",
        "user.address",
        "user.phone",
        "user.mobile",
        "user.email",
        "user.name_kana",
        "user.blood_rh",
        "user.fax",
        "user.registered_domicile_postal_code",
        "user.registered_domicile",
        "user.memo",
        "recipient_certificate.certificate_type",
        "recipient_certificate.facility_type",
        "recipient_certificate.issued_date",
        "recipient_certificate.issuing_authority_name",
        "recipient_certificate.valid_from",
        "recipient_certificate.disability_support_level",
        "recipient_certificate.physical_care_quantity",
        "recipient_certificate.housework_assistance_quantity",
        "recipient_certificate.outpatient_mobility_assistance_quantity",
        "recipient_certificate.outpatient_physical_assistance_quantity",
        "recipient_certificate.daily_living_quantity",
        "recipient_certificate.day_service_quantity",
        "recipient_certificate.day_service_ii_quantity",
        "recipient_certificate.meal_quantity",
        "recipient_certificate.bathing_quantity",
        "recipient_certificate.self_household_tier",
        "recipient_certificate.self_copayment_amount",
        "recipient_certificate.self_monthly_cap",
        "recipient_certificate.supporter_household_tier",
        "recipient_certificate.supporter_copayment_amount",
        "recipient_certificate.supporter_monthly_cap",
        "recipient_certificate.memo",
        "recipient_certificate.same_household_multi_user_cap_management",
        "service_contract.provider_name",
        "service_contract.provider_entry_number",
        "service_contract.contract_date",
        "service_contract.contract_type",
        "service_contract.service_content",
        "service_contract.contracted_quantity_hours",
        "service_contract.contracted_quantity_days_or_times",
        "service_contract.contracted_meal_quantity",
        "service_contract.contracted_bathing_quantity",
        "service_contract.service_end_date",
        "service_contract.end_classification",
        "service_delivery.provided_quantity_hours",
        "service_delivery.provided_quantity_days_or_times",
        "service_delivery.provided_meal_quantity",
        "service_delivery.provided_bathing_quantity",
        "service_entitlement.boarding_assistance_quantity",
        "service_entitlement.behavior_support_quantity",
        "service_entitlement.outing_assistance_quantity",
        "service_entitlement.outing_with_physical_care_quantity",
        "service_addition.meal_addition_i",
        "cost_sharing.copayment_rate_percent",
        "cost_sharing.income_classification",
        "cost_sharing.monthly_cap",
        "cost_sharing.reduced_monthly_cap",
        "cost_sharing.social_welfare_corporation_reduction",
        "upper_limit_management.expected_cap_reached_classification",
        "cost_sharing.relief_program_classification",
        "cost_sharing.relief_program_cap",
        "upper_limit_management.managing_provider",
        "service_entitlement.mutual_use",
        "service_entitlement.severe_home_visit_comprehensive",
        "service_entitlement.severe_home_visit_class_6",
        "service_entitlement.severe_home_visit_other",
        "service_entitlement.extremely_severe_classification",
        "service_addition.meal_addition_ii",
        "recipient_certificate.legacy_law_recipient",
        "service_addition.nutrition_management_on_service_day",
        "service_entitlement.accompanying_support_primary",
        "service_entitlement.accompanying_support_with_physical_care",
        "recipient_certificate.certificate_number",
        "recipient_certificate.valid_until",
    ]);
class RecipientCertificateSemanticContract {
    constructor({
        additionalSupportedSemanticTargets = []
    } = {}) {
        this.supportedSemanticTargets =
            new Set(
                SUPPORTED_SEMANTIC_TARGETS
            );

        if (
            Array.isArray(
                additionalSupportedSemanticTargets
            )
        ) {
            for (
                const target
                of additionalSupportedSemanticTargets
            ) {
                if (
                    typeof target === "string" &&
                    target.trim()
                ) {
                    this.supportedSemanticTargets
                        .add(
                            target.trim()
                        );
                }
            }
        }
    }

    listSupportedSemanticTargets() {
        return Array.from(
            this.supportedSemanticTargets
        );
    }

    assertSupported(semanticKey) {
        if (
            !this.supportedSemanticTargets
                .has(semanticKey)
        ) {
            const error = new Error(
                "Recipient certificate semantic target is unsupported"
            );
            error.code =
                "recipient_certificate_semantic_target_unsupported";
            throw error;
        }
    }
}

module.exports =
    RecipientCertificateSemanticContract;
