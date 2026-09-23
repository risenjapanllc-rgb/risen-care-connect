"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("./RecipientCertificateExecutionService");

const digest = "a".repeat(64);
const residentId = "33333333-3333-4333-8333-333333333333";

function plan(overrides = {}) {
    return {
        resolution: "planned_new",
        identifierType: "name",
        identifierDigest: digest,
        residentId: null,
        displayName: "Test Resident",
        persistenceAction: "create",
        persistenceContract: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "recipient_certificate.number": "ABC123"
            },
            contentHash: "b".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-1",
            expectedContentHash: null
        },
        ...overrides
    };
}

function request(executionPlan = [plan()]) {
    return {
        sourceDocumentKey: "source.xlsx",
        sourceUpdatedAt: "2026-09-22T01:00:00.000Z",
        sourceSize: 123,
        executionPlan
    };
}

function service({
    mappings = [],
    admissionResult = {
        status: "created",
        residentId,
        residentCreated: true
    },
    persistenceResult = {
        status: "created",
        recordId: "record-1"
    }
} = {}) {
    const calls = { mapping: [], admission: [], persistence: [] };

    return {
        calls,
        instance: new Service({
            sourceResidentMappingClient: {
                async list(snapshot) {
                    calls.mapping.push(snapshot);
                    return { status: "found", mappings };
                }
            },
            residentAdmissionClient: {
                async admit(contract) {
                    calls.admission.push(contract);
                    return admissionResult;
                }
            },
            semanticPersistenceClient: {
                async persist(contract) {
                    calls.persistence.push(contract);
                    return persistenceResult;
                }
            }
        })
    };
}

test("invalid later entry blocks the entire plan before any side effect", async () => {
    const { instance, calls } = service();

    const result =
        await instance.execute(
            request([
                plan(),
                plan({
                    identifierDigest:
                        "d".repeat(64),
                    persistenceContract: null
                })
            ])
        );

    assert.strictEqual(
        result.status,
        "invalid"
    );
    assert.strictEqual(
        result.processed,
        0
    );
    assert.strictEqual(
        calls.mapping.length,
        0
    );
    assert.strictEqual(
        calls.admission.length,
        0
    );
    assert.strictEqual(
        calls.persistence.length,
        0
    );
});

test("duplicate plan identity blocks the entire plan before any side effect", async () => {
    const { instance, calls } = service();

    const result =
        await instance.execute(
            request([
                plan(),
                plan({
                    displayName:
                        "Same Identity Second Entry",
                    persistenceContract: {
                        semanticType:
                            "recipient_certificate",
                        logicalSlot:
                            "primary",
                        semanticContent: {
                            "recipient_certificate.number":
                                "XYZ999"
                        },
                        contentHash:
                            "e".repeat(64),
                        canonicalizationVersion:
                            "risen-recipient-certificate-canonicalization-1",
                        expectedContentHash:
                            null
                    }
                })
            ])
        );

    assert.strictEqual(
        result.status,
        "conflict"
    );
    assert.strictEqual(
        result.processed,
        0
    );
    assert.strictEqual(
        calls.mapping.length,
        0
    );
    assert.strictEqual(
        calls.admission.length,
        0
    );
    assert.strictEqual(
        calls.persistence.length,
        0
    );
});

test("planned new atomically admits then persists semantic record", async () => {
    const { instance, calls } = service();
    const result = await instance.execute(request());

    assert.strictEqual(result.status, "completed");
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.created, 1);
    assert.strictEqual(result.residentsCreated, 1);
    assert.strictEqual(calls.admission.length, 1);
    assert.strictEqual(calls.persistence.length, 1);
    assert.strictEqual(calls.persistence[0].residentId, residentId);
    assert.strictEqual(calls.persistence[0].sourceDocumentKey, "source.xlsx");
});

test("confirmed mapping converges planned-new retry without second admission", async () => {
    const { instance, calls } = service({
        mappings: [{
            identifierType: "name",
            identifierDigest: digest,
            mappingStatus: "confirmed",
            residentId
        }],
        persistenceResult: {
            status: "unchanged",
            recordId: "record-1"
        }
    });

    const result = await instance.execute(request());

    assert.strictEqual(result.status, "completed");
    assert.strictEqual(result.unchanged, 1);
    assert.strictEqual(calls.admission.length, 0);
    assert.strictEqual(calls.persistence[0].residentId, residentId);
});

test("existing resident requires exact confirmed mapping", async () => {
    const entry = plan({
        resolution: "existing",
        residentId
    });
    const { instance, calls } = service();

    const result = await instance.execute(request([entry]));

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(calls.admission.length, 0);
    assert.strictEqual(calls.persistence.length, 0);
});

test("existing resident mapping mismatch stops before persistence", async () => {
    const entry = plan({
        resolution: "existing",
        residentId
    });
    const { instance, calls } = service({
        mappings: [{
            identifierType: "name",
            identifierDigest: digest,
            mappingStatus: "confirmed",
            residentId: "other-resident"
        }]
    });

    const result = await instance.execute(request([entry]));

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(calls.persistence.length, 0);
});

test("admission non-writing statuses stop semantic persistence", async () => {
    for (const status of [
        "stale",
        "not_approved",
        "conflict",
        "name_conflict"
    ]) {
        const { instance, calls } = service({
            admissionResult: {
                status,
                residentId: null,
                residentCreated: false
            }
        });

        const result = await instance.execute(request());
        assert.strictEqual(result.status, status);
        assert.strictEqual(calls.persistence.length, 0);
    }
});

test("semantic stale and conflict stop safely", async () => {
    for (const status of ["stale", "conflict"]) {
        const { instance } = service({
            persistenceResult: {
                status,
                recordId: null
            }
        });

        const result = await instance.execute(request());
        assert.strictEqual(result.status, status);
        assert.strictEqual(result.processed, 0);
    }
});

test("planned new user_code fails closed before admission", async () => {
    const { instance, calls } = service();
    const result = await instance.execute(request([
        plan({
            identifierType: "user_code",
            displayName: null
        })
    ]));

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(calls.admission.length, 0);
    assert.strictEqual(calls.persistence.length, 0);
});

test("exact snapshot is used for mapping and persistence", async () => {
    const { instance, calls } = service();
    await instance.execute(request());

    assert.deepStrictEqual(calls.mapping, [{
        sourceDocumentKey: "source.xlsx",
        sourceUpdatedAt: "2026-09-22T01:00:00.000Z",
        sourceSize: 123
    }]);
    assert.strictEqual(
        calls.persistence[0].sourceUpdatedAt,
        "2026-09-22T01:00:00.000Z"
    );
    assert.strictEqual(calls.persistence[0].sourceSize, 123);
});

test("planned new passes writable user semantic fields as resident profile to admission", async () => {
    const entry = plan({
        displayName: "鈴木 大輔",
        persistenceContract: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "user.name": "鈴木 大輔",
                "user.birth_date": "2/22/77",
                "user.gender": "男性",
                "recipient_certificate.certificate_number": "1234567893",
                "user.active": "false"
            },
            contentHash: "b".repeat(64),
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-1",
            expectedContentHash: null
        }
    });

    const { instance, calls } = service();

    const result = await instance.execute(request([entry]));

    assert.strictEqual(result.status, "completed");
    assert.strictEqual(calls.admission.length, 1);

    assert.deepStrictEqual(
        calls.admission[0].residentProfile,
        {
            name: "鈴木 大輔",

            gender: "男性"
        }
    );
});
