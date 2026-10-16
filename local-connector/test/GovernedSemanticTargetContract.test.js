"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const GovernedSemanticTargetContract =
    require(
        "../GovernedSemanticTargetContract"
    );

test(
    "governed semantic target contract accepts only authority supplied targets",
    () => {
        const contract =
            new GovernedSemanticTargetContract({
                supportedSemanticTargets: [
                    "user.name",
                    "recipient_certificate.certificate_number"
                ]
            });

        assert.doesNotThrow(
            () =>
                contract.assertSupported(
                    "user.name"
                )
        );

        assert.throws(
            () =>
                contract.assertSupported(
                    "user.birth_date"
                ),
            error =>
                error?.code ===
                "semantic_target_unsupported"
        );
    }
);

test(
    "governed semantic target contract keeps authority immutable from returned list",
    () => {
        const contract =
            new GovernedSemanticTargetContract({
                supportedSemanticTargets: [
                    "user.name"
                ]
            });

        const targets =
            contract
                .listSupportedSemanticTargets();

        targets.push(
            "recipient_certificate.not_real"
        );

        assert.deepStrictEqual(
            contract
                .listSupportedSemanticTargets(),
            [
                "user.name"
            ]
        );
    }
);

test(
    "governed semantic target contract de-duplicates and normalizes authority input only",
    () => {
        const contract =
            new GovernedSemanticTargetContract({
                supportedSemanticTargets: [
                    "user.name",
                    " user.name ",
                    "",
                    null
                ]
            });

        assert.deepStrictEqual(
            contract
                .listSupportedSemanticTargets(),
            [
                "user.name"
            ]
        );

        assert.throws(
            () =>
                contract.assertSupported(
                    " user.name "
                ),
            error =>
                error?.code ===
                "semantic_target_unsupported"
        );
    }
);
