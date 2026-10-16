"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificateSemanticContract =
    require("../RecipientCertificateSemanticContract");

test("recipient certificate semantic contract accepts governed targets", () => {
    const contract =
        new RecipientCertificateSemanticContract();

    const supportedTargets = [
        "user.user_code",
        "user.name",
        "user.birth_date",
        "user.gender",
        "recipient_certificate.certificate_number",
        "recipient_certificate.valid_until"
    ];

    for (const semanticKey of supportedTargets) {
        assert.doesNotThrow(
            () => contract.assertSupported(semanticKey)
        );
    }
});

test("recipient certificate semantic contract rejects unsupported targets", () => {
    const contract =
        new RecipientCertificateSemanticContract();

    assert.throws(
        () =>
            contract.assertSupported(
                "recipient_certificate.not_a_real_field"
            ),
        error =>
            error &&
            error.code ===
                "recipient_certificate_semantic_target_unsupported"
    );

    assert.throws(
        () =>
            contract.assertSupported(
                "user.facility_id"
            ),
        error =>
            error &&
            error.code ===
                "recipient_certificate_semantic_target_unsupported"
    );
});

test("recipient certificate semantic contract does not normalize target names", () => {
    const contract =
        new RecipientCertificateSemanticContract();

    assert.throws(
        () =>
            contract.assertSupported(
                " user.name "
            ),
        error =>
            error &&
            error.code ===
                "recipient_certificate_semantic_target_unsupported"
    );
});

test("recipient certificate semantic contract lists governed targets", () => {
    const contract =
        new RecipientCertificateSemanticContract();

    const targets =
        contract.listSupportedSemanticTargets();

    assert.equal(
        targets.length,
        80
    );

    assert.equal(
        new Set(targets).size,
        80
    );

    for (const semanticKey of [
        "user.user_code",
        "user.name",
        "user.birth_date",
        "user.gender",
        "recipient_certificate.certificate_number",
        "recipient_certificate.valid_until",
        "recipient_certificate.issued_date",
        "service_contract.provider_name",
        "service_delivery.provided_quantity_hours",
        "service_entitlement.mutual_use",
        "service_addition.meal_addition_i",
        "cost_sharing.monthly_cap",
        "upper_limit_management.managing_provider"
    ]) {
        assert.equal(
            targets.includes(semanticKey),
            true
        );
    }

    assert.equal(
        targets.includes(
            "source_specific.handwritten_contract_quantity"
        ),
        false
    );

    assert.equal(
        targets.includes(
            "support_record.record_content"
        ),
        false
    );
});

test("recipient certificate semantic target list cannot mutate contract authority", () => {
    const contract =
        new RecipientCertificateSemanticContract();

    const targets =
        contract.listSupportedSemanticTargets();

    targets.push("recipient_certificate.not_a_real_field");

    assert.throws(
        () =>
            contract.assertSupported(
                "recipient_certificate.not_a_real_field"
            ),
        error =>
            error?.code ===
            "recipient_certificate_semantic_target_unsupported"
    );

    assert.equal(
        contract.listSupportedSemanticTargets().includes(
            "recipient_certificate.not_a_real_field"
        ),
        false
    );
});

test(
    "recipient certificate semantic contract accepts governed aggregate entity targets",
    () => {
        const contract =
            new RecipientCertificateSemanticContract();

        const supportedTargets = [
            "recipient_certificate.self_monthly_cap",
            "recipient_certificate.legacy_law_recipient",
            "service_contract.provider_name",
            "service_delivery.provided_quantity_hours",
            "service_entitlement.mutual_use",
            "service_addition.meal_addition_i",
            "cost_sharing.monthly_cap",
            "upper_limit_management.managing_provider"
        ];

        for (const semanticKey of supportedTargets) {
            assert.doesNotThrow(
                () =>
                    contract.assertSupported(
                        semanticKey
                    )
            );
        }
    }
);

test(
    "recipient certificate semantic contract keeps source specific meanings outside governed aggregate",
    () => {
        const contract =
            new RecipientCertificateSemanticContract();

        assert.throws(
            () =>
                contract.assertSupported(
                    "source_specific.handwritten_contract_quantity"
                ),
            error =>
                error &&
                error.code ===
                    "recipient_certificate_semantic_target_unsupported"
        );
    }
);

test(
    "recipient certificate semantic contract accepts additional governed target without mutating static authority",
    () => {
        const dynamicTarget =
            "dynamic_test.example_field";

        const dynamicContract =
            new RecipientCertificateSemanticContract({
                additionalSupportedSemanticTargets: [
                    dynamicTarget
                ]
            });

        assert.doesNotThrow(
            () =>
                dynamicContract.assertSupported(
                    dynamicTarget
                )
        );

        assert.equal(
            dynamicContract
                .listSupportedSemanticTargets()
                .includes(dynamicTarget),
            true
        );

        const baselineContract =
            new RecipientCertificateSemanticContract();

        assert.throws(
            () =>
                baselineContract.assertSupported(
                    dynamicTarget
                ),
            error =>
                error &&
                error.code ===
                    "recipient_certificate_semantic_target_unsupported"
        );
    }
);
