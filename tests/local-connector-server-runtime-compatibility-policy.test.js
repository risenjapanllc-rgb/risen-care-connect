"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    evaluateRuntimeCapability
} =
    require(
        "../local-connector/LocalConnectorRuntimeCompatibilityPolicy"
    );

function validContract(
    capabilities = [
        "recipient_certificate.preview"
    ]
) {
    return {
        contractVersion:
            "local-connector-runtime-v1",
        service:
            "RISEN CARE Local Connector",
        capabilities
    };
}

test("server runtime policy supports a capability only under the compatible runtime contract", () => {
    assert.deepStrictEqual(
        evaluateRuntimeCapability(
            validContract(),
            "recipient_certificate.preview"
        ),
        {
            status: "supported",
            supported: true
        }
    );
});

test("server runtime policy distinguishes a missing capability", () => {
    assert.deepStrictEqual(
        evaluateRuntimeCapability(
            validContract([]),
            "recipient_certificate.preview"
        ),
        {
            status:
                "capability_unsupported",
            supported: false
        }
    );
});

test("server runtime policy rejects an unknown runtime contract version", () => {
    assert.deepStrictEqual(
        evaluateRuntimeCapability(
            {
                ...validContract(),
                contractVersion:
                    "local-connector-runtime-v999"
            },
            "recipient_certificate.preview"
        ),
        {
            status:
                "runtime_incompatible",
            supported: false
        }
    );
});

test("server runtime policy rejects the wrong runtime service", () => {
    assert.deepStrictEqual(
        evaluateRuntimeCapability(
            {
                ...validContract(),
                service:
                    "Some Other Service"
            },
            "recipient_certificate.preview"
        ),
        {
            status:
                "runtime_incompatible",
            supported: false
        }
    );
});

test("server runtime policy fails closed for malformed runtime contract data", () => {
    for (
        const contract
        of [
            null,
            undefined,
            {},
            {
                ...validContract(),
                capabilities: null
            },
            {
                ...validContract(),
                capabilities: [
                    "recipient_certificate.preview",
                    " bad-capability "
                ]
            }
        ]
    ) {
        assert.deepStrictEqual(
            evaluateRuntimeCapability(
                contract,
                "recipient_certificate.preview"
            ),
            {
                status:
                    "runtime_unavailable",
                supported: false
            }
        );
    }
});

test("server runtime policy fails closed for an invalid required capability", () => {
    for (
        const requiredCapability
        of [
            null,
            "",
            " recipient_certificate.preview "
        ]
    ) {
        assert.deepStrictEqual(
            evaluateRuntimeCapability(
                validContract(),
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
