"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Client = require(
    "./RecipientCertificateAtomicPersistenceHttpClient"
);

function contract() {
    return {
        resolution: "existing",
        identifierType: "name",
        identifierDigest: "a".repeat(64),
        residentId:
            "33333333-3333-4333-8333-333333333333",
        displayName: "Test Resident",
        residentProfile: {
            name: "Test Resident",
            birth_date: "1984-03-27",
            gender: "男性"
        },
        semantic: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "user.name": "Test Resident"
            },
            contentHash: "b".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: null
        },
        sourceDocumentKey: "source.xlsx",
        sourceUpdatedAt:
            "2026-09-22T01:00:00.000Z",
        sourceSize: 123
    };
}

test("atomic HTTP client sends exactly one authenticated request", async () => {
    const calls = [];

    const client = new Client({
        endpoint:
            "https://example.test/connector/recipient-certificate-atomic-persistence",
        connectorId: "connector-1",
        credentialProvider: {
            async getCredential() {
                return "credential-1";
            }
        },
        authorizationScheme: "RISEN-Connector",
        async fetchImpl(endpoint, options) {
            calls.push({ endpoint, options });

            return {
                ok: true,
                async json() {
                    return {
                        status: "updated",
                        residentId:
                            "33333333-3333-4333-8333-333333333333",
                        recordId:
                            "44444444-4444-4444-8444-444444444444",
                        residentCreated: false
                    };
                }
            };
        }
    });

    const result =
        await client.persist(contract());

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(
        calls[0].options.headers["x-risen-connector-id"],
        "connector-1"
    );
    assert.strictEqual(
        calls[0].options.headers.Authorization,
        "RISEN-Connector credential-1"
    );

    assert.deepStrictEqual(
        JSON.parse(calls[0].options.body),
        contract()
    );

    assert.deepStrictEqual(result, {
        status: "updated",
        residentId:
            "33333333-3333-4333-8333-333333333333",
        recordId:
            "44444444-4444-4444-8444-444444444444",
        residentCreated: false
    });
});

test("atomic HTTP client preserves conflict result without retry write", async () => {
    let calls = 0;

    const client = new Client({
        endpoint:
            "https://example.test/connector/recipient-certificate-atomic-persistence",
        connectorId: "connector-1",
        credentialProvider: {
            async getCredential() {
                return "credential-1";
            }
        },
        authorizationScheme: "RISEN-Connector",
        async fetchImpl() {
            calls += 1;

            return {
                ok: false,
                async json() {
                    return {
                        status: "conflict",
                        residentId: null,
                        recordId: null
                    };
                }
            };
        }
    });

    const result =
        await client.persist(contract());

    assert.strictEqual(calls, 1);
    assert.strictEqual(result.status, "conflict");
});
