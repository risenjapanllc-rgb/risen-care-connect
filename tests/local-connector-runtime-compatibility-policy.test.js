"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    evaluateRuntimeCapability,
    getRequiredCapability
} = require(
    "../js/local-connector-runtime-compatibility-policy"
);

const VALID_CONTRACT = {
    contractVersion:
        "local-connector-runtime-v1",
    service:
        "RISEN CARE Local Connector",
    capabilities: [
        "recipient_certificate.semantic_contract",
        "recipient_certificate.preview",
        "recipient_certificate.fingerprint_execution"
    ]
};

test("supports a required capability only under the known runtime contract", () => {
    assert.deepStrictEqual(
        evaluateRuntimeCapability(
            VALID_CONTRACT,
            "recipient_certificate.semantic_contract"
        ),
        {
            status: "supported",
            supported: true
        }
    );
});

test("distinguishes a missing capability from runtime incompatibility", () => {
    assert.deepStrictEqual(
        evaluateRuntimeCapability(
            VALID_CONTRACT,
            "recipient_certificate.atomic_promotion"
        ),
        {
            status:
                "capability_unsupported",
            supported: false
        }
    );
});

test("fails closed on an unknown runtime contract version", () => {
    assert.deepStrictEqual(
        evaluateRuntimeCapability(
            {
                ...VALID_CONTRACT,
                contractVersion:
                    "local-connector-runtime-v999"
            },
            "recipient_certificate.semantic_contract"
        ),
        {
            status:
                "runtime_incompatible",
            supported: false
        }
    );
});

test("distinguishes unavailable or malformed runtime contract data", () => {
    for (
        const contract of
            [
                null,
                undefined,
                {},
                {
                    contractVersion:
                        "local-connector-runtime-v1",
                    service:
                        "RISEN CARE Local Connector",
                    capabilities:
                        null
                }
            ]
    ) {
        assert.deepStrictEqual(
            evaluateRuntimeCapability(
                contract,
                "recipient_certificate.semantic_contract"
            ),
            {
                status:
                    "runtime_unavailable",
                supported: false
            }
        );
    }
});

test("fails closed for an invalid required capability", () => {
    for (
        const requiredCapability of
            [
                null,
                "",
                " recipient_certificate.semantic_contract "
            ]
    ) {
        assert.deepStrictEqual(
            evaluateRuntimeCapability(
                VALID_CONTRACT,
                requiredCapability
            ),
            {
                status:
                    "runtime_unavailable",
                supported: false
            }
        );
    }
});

test(
    "maps recipient certificate operations to their required runtime capabilities",
    () => {
        assert.strictEqual(
            getRequiredCapability(
                "recipient_certificate",
                "semantic_contract"
            ),
            "recipient_certificate.semantic_contract"
        );

        assert.strictEqual(
            getRequiredCapability(
                "recipient_certificate",
                "preview"
            ),
            "recipient_certificate.preview"
        );

        assert.strictEqual(
            getRequiredCapability(
                "recipient_certificate",
                "fingerprint_execution"
            ),
            "recipient_certificate.fingerprint_execution"
        );
    }
);

test(
    "does not invent runtime capabilities for unsupported semantic operations",
    () => {
        assert.strictEqual(
            getRequiredCapability(
                "recipient_certificate",
                "unknown_operation"
            ),
            null
        );

        assert.strictEqual(
            getRequiredCapability(
                "unknown_semantic_type",
                "preview"
            ),
            null
        );
    }
);
