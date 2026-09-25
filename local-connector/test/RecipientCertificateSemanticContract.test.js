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
