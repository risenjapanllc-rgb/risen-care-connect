"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const LocalConnectorRuntimeContract =
    require("../local-connector/LocalConnectorRuntimeContract");

test("declares the versioned Local Connector runtime capability contract", () => {
    const contract =
        new LocalConnectorRuntimeContract();

    assert.deepStrictEqual(
        contract.describe(),
        {
            contractVersion:
                "local-connector-runtime-v1",
            service:
                "RISEN CARE Local Connector",
            capabilities: [
                "recipient_certificate.semantic_contract",
                "recipient_certificate.preview",
                "recipient_certificate.fingerprint_execution"
            ]
        }
    );
});

test("returns fresh capability data so callers cannot mutate contract authority", () => {
    const contract =
        new LocalConnectorRuntimeContract();

    const first =
        contract.describe();

    first.capabilities.push(
        "untrusted.capability"
    );

    const second =
        contract.describe();

    assert.deepStrictEqual(
        second.capabilities,
        [
            "recipient_certificate.semantic_contract",
            "recipient_certificate.preview",
            "recipient_certificate.fingerprint_execution"
        ]
    );
});
