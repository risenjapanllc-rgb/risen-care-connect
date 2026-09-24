"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require(
    "./RecipientCertificateAtomicPersistenceService"
);

function validContract(overrides = {}) {
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
                "recipient_certificate.certificate_number":
                    "ABC123"
            },
            contentHash: "b".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: null
        },
        sourceDocumentKey: "source.xlsx",
        sourceUpdatedAt:
            "2026-09-22T01:00:00.000Z",
        sourceSize: 123,
        ...overrides
    };
}

function service(result = {
    status: "updated",
    residentId:
        "33333333-3333-4333-8333-333333333333",
    recordId:
        "44444444-4444-4444-8444-444444444444",
    residentCreated: false
}) {
    const calls = [];

    return {
        calls,
        instance: new Service({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "11111111-1111-4111-8111-111111111111",
                            connectorId:
                                "22222222-2222-4222-8222-222222222222"
                        }
                    };
                }
            },
            repository: {
                async persist(contract) {
                    calls.push(contract);
                    return result;
                }
            }
        })
    };
}


test("verified trust scope is passed to repository", async () => {
    const { instance, calls } = service();

    await instance.persist(validContract({
        connectorId: "client-connector",
        credential: "credential"
    }));

    assert.strictEqual(
        calls[0].verifiedFacilityId,
        "11111111-1111-4111-8111-111111111111"
    );
    assert.strictEqual(
        calls[0].verifiedConnectorId,
        "22222222-2222-4222-8222-222222222222"
    );
});

test("denied connector never reaches repository", async () => {
    const calls = [];

    const instance = new Service({
        connectorTrustService: {
            async authenticate() {
                return { status: "denied" };
            }
        },
        repository: {
            async persist(input) {
                calls.push(input);
            }
        }
    });

    const result =
        await instance.persist(validContract());

    assert.deepStrictEqual(result, {
        status: "denied",
        errorCode: "connector_trust_denied"
    });
    assert.strictEqual(calls.length, 0);
});

test("valid contract reaches repository exactly once", async () => {
    const { instance, calls } = service();

    const result =
        await instance.persist(validContract());

    assert.strictEqual(result.status, "updated");
    assert.strictEqual(calls.length, 1);
});

test("planned_new name contract is accepted", async () => {
    const { instance, calls } = service({
        status: "created",
        residentId:
            "55555555-5555-4555-8555-555555555555",
        recordId:
            "44444444-4444-4444-8444-444444444444",
        residentCreated: true
    });

    const result = await instance.persist(
        validContract({
            resolution: "planned_new",
            residentId: null,
            displayName: "New Resident"
        })
    );

    assert.strictEqual(result.status, "created");
    assert.strictEqual(calls.length, 1);
});

test("unsafe profile field fails before repository", async () => {
    const { instance, calls } = service();

    const result = await instance.persist(
        validContract({
            residentProfile: {
                name: "Test Resident",
                active: false
            }
        })
    );

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(calls.length, 0);
});

test("unsupported canonicalization fails before repository", async () => {
    const { instance, calls } = service();

    const contract = validContract();
    contract.semantic = {
        ...contract.semantic,
        canonicalizationVersion:
            "risen-recipient-certificate-canonicalization-999"
    };

    const result = await instance.persist(contract);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(calls.length, 0);
});

test("invalid hash fails before repository", async () => {
    const { instance, calls } = service();

    const contract = validContract();
    contract.semantic = {
        ...contract.semantic,
        contentHash: "not-a-hash"
    };

    const result = await instance.persist(contract);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(calls.length, 0);
});

test("repository failure is fail-closed", async () => {
    const instance = new Service({
        connectorTrustService: {
            async authenticate() {
                return {
                    status: "verified",
                    verifiedContext: {
                        facilityId:
                            "11111111-1111-4111-8111-111111111111",
                        connectorId:
                            "22222222-2222-4222-8222-222222222222"
                    }
                };
            }
        },
        repository: {
            async persist() {
                throw new Error("database unavailable");
            }
        }
    });

    const result =
        await instance.persist(validContract());

    assert.deepStrictEqual(result, {
        status: "unavailable",
        errorCode:
            "recipient_certificate_atomic_persistence_unavailable"
    });
});
