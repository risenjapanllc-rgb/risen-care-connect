"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificateExecutionService =
    require("./RecipientCertificateExecutionService");

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function createEntry(overrides = {}) {
    const resolution =
        overrides.resolution || "existing";

    return {
        identifierType: "name",
        identifierDigest: HASH_A,
        resolution,
        residentId:
            resolution === "existing"
                ? "resident-1"
                : null,
        displayName: "山田 太郎",
        persistenceAction: "create",
        residentProfileComparison:
            resolution === "existing"
                ? {
                    fill: {},
                    conflicts: {}
                }
                : null,
        persistenceContract: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "user.name": "山田 太郎"
            },
            contentHash: HASH_B,
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: null
        },
        ...overrides
    };
}

function createPlan(entries, overrides = {}) {
    return {
        sourceDocumentKey: "source.xlsx",
        sourceUpdatedAt:
            "2026-09-22T01:00:00.000Z",
        sourceSize: 123,
        executionPlan: entries,
        ...overrides
    };
}

function createService({
    mappings = [],
    atomicResult = {
        status: "created",
        residentId: "resident-1",
        recordId: "record-1",
        residentCreated: false
    },
    atomicImpl = null
} = {}) {
    const mappingCalls = [];
    const atomicCalls = [];

    const service =
        new RecipientCertificateExecutionService({
            sourceResidentMappingClient: {
                async list(snapshot) {
                    mappingCalls.push(snapshot);
                    return {
                        status: "found",
                        mappings
                    };
                }
            },
            atomicPersistenceClient: {
                async persist(contract) {
                    atomicCalls.push(contract);

                    if (atomicImpl) {
                        return atomicImpl(
                            contract,
                            atomicCalls.length
                        );
                    }

                    return atomicResult;
                }
            }
        });

    return {
        service,
        mappingCalls,
        atomicCalls
    };
}

test("invalid later entry blocks the entire plan before any write", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [
                {
                    identifierType: "name",
                    identifierDigest: HASH_A,
                    residentId: "resident-1",
                    mappingStatus: "confirmed"
                }
            ]
        });

    const invalidEntry = createEntry({
        identifierDigest: HASH_C,
        persistenceContract: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "user.name": "佐藤 花子"
            },
            contentHash: "not-a-hash",
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: null
        }
    });

    const result = await service.execute(
        createPlan([
            createEntry(),
            invalidEntry
        ])
    );

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(atomicCalls.length, 0);
});

test("duplicate identity blocks the entire plan as conflict before any write", async () => {
    const { service, atomicCalls } =
        createService();

    const result = await service.execute(
        createPlan([
            createEntry(),
            createEntry()
        ])
    );

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(atomicCalls.length, 0);
});

test("planned new resident is persisted with exactly one atomic write", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [],
            atomicResult: {
                status: "created",
                residentId: "resident-new",
                recordId: "record-new",
                residentCreated: true
            }
        });

    const entry = createEntry({
        resolution: "planned_new",
        residentId: null,
        residentProfileComparison: null
    });

    const result = await service.execute(
        createPlan([entry])
    );

    assert.strictEqual(result.status, "completed");
    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.created, 1);
    assert.strictEqual(result.residentsCreated, 1);
    assert.strictEqual(atomicCalls.length, 1);

    assert.strictEqual(
        atomicCalls[0].resolution,
        "planned_new"
    );
    assert.strictEqual(
        atomicCalls[0].residentId,
        null
    );
    assert.strictEqual(
        atomicCalls[0].residentProfile.name,
        "山田 太郎"
    );
});

test("retry after planned new mapping is confirmed fails closed before write", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [
                {
                    identifierType: "name",
                    identifierDigest: HASH_A,
                    residentId: "resident-new",
                    mappingStatus: "confirmed"
                }
            ]
        });

    const result = await service.execute(
        createPlan([
            createEntry({
                resolution: "planned_new",
                residentId: null,
                residentProfileComparison: null
            })
        ])
    );

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(atomicCalls.length, 0);
});

test("existing mapping mismatch fails closed before write", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [
                {
                    identifierType: "name",
                    identifierDigest: HASH_A,
                    residentId: "resident-other"
                }
            ]
        });

    const result = await service.execute(
        createPlan([createEntry()])
    );

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(atomicCalls.length, 0);
});

test("existing mapping absence fails closed before write", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: []
        });

    const result = await service.execute(
        createPlan([createEntry()])
    );

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(atomicCalls.length, 0);
});

test("existing resident profile conflict fails before atomic write", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [
                {
                    identifierType: "name",
                    identifierDigest: HASH_A,
                    residentId: "resident-1",
                    mappingStatus: "confirmed"
                }
            ]
        });

    const result = await service.execute(
        createPlan([
            createEntry({
                residentProfileComparison: {
                    fill: {},
                    conflicts: {
                        birth_date: {
                            current: "1980-01-01",
                            incoming: "1984-03-27"
                        }
                    }
                }
            })
        ])
    );

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(atomicCalls.length, 0);
});

test("semantic stale result fails closed without counting processed", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [
                {
                    identifierType: "name",
                    identifierDigest: HASH_A,
                    residentId: "resident-1",
                    mappingStatus: "confirmed"
                }
            ],
            atomicResult: {
                status: "stale",
                residentId: null,
                recordId: null,
                residentCreated: false
            }
        });

    const result = await service.execute(
        createPlan([createEntry()])
    );

    assert.strictEqual(result.status, "stale");
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(atomicCalls.length, 1);
});

test("semantic conflict result fails closed without counting processed", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [
                {
                    identifierType: "name",
                    identifierDigest: HASH_A,
                    residentId: "resident-1",
                    mappingStatus: "confirmed"
                }
            ],
            atomicResult: {
                status: "conflict",
                residentId: null,
                recordId: null,
                residentCreated: false
            }
        });

    const result = await service.execute(
        createPlan([createEntry()])
    );

    assert.strictEqual(result.status, "conflict");
    assert.strictEqual(result.processed, 0);
    assert.strictEqual(atomicCalls.length, 1);
});

test("planned new user_code fails closed before atomic write", async () => {
    const { service, atomicCalls } =
        createService();

    const result = await service.execute(
        createPlan([
            createEntry({
                resolution: "planned_new",
                residentId: null,
                identifierType: "user_code",
                displayName: null,
                residentProfileComparison: null
            })
        ])
    );

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(atomicCalls.length, 0);
});

test("atomic write receives exact source snapshot and semantic contract", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [
                {
                    identifierType: "name",
                    identifierDigest: HASH_A,
                    residentId: "resident-1",
                    mappingStatus: "confirmed"
                }
            ],
            atomicResult: {
                status: "unchanged",
                residentId: "resident-1",
                recordId: "record-1",
                residentCreated: false
            }
        });

    const entry = createEntry({
        persistenceContract: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "user.name": "山田 太郎",
                "user.birth_date": "1984-03-27"
            },
            contentHash: HASH_B,
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: HASH_C
        }
    });

    const plan = createPlan([entry]);

    const result = await service.execute(plan);

    assert.strictEqual(result.status, "completed");
    assert.strictEqual(result.unchanged, 1);
    assert.strictEqual(atomicCalls.length, 1);

    assert.deepStrictEqual(
        atomicCalls[0].semantic,
        {
            semanticType:
                entry.persistenceContract.semanticType,
            logicalSlot:
                entry.persistenceContract.logicalSlot,
            semanticContent:
                entry.persistenceContract.semanticContent,
            contentHash:
                entry.persistenceContract.contentHash,
            canonicalizationVersion:
                entry.persistenceContract.canonicalizationVersion,
            expectedContentHash:
                entry.persistenceContract.expectedContentHash
        }
    );

    assert.strictEqual(
        atomicCalls[0].sourceDocumentKey,
        plan.sourceDocumentKey
    );
    assert.strictEqual(
        atomicCalls[0].sourceUpdatedAt,
        plan.sourceUpdatedAt
    );
    assert.strictEqual(
        atomicCalls[0].sourceSize,
        plan.sourceSize
    );
});

test("planned new passes writable user semantic fields in atomic resident profile", async () => {
    const { service, atomicCalls } =
        createService({
            mappings: [],
            atomicResult: {
                status: "created",
                residentId: "resident-new",
                recordId: "record-new",
                residentCreated: true
            }
        });

    const entry = createEntry({
        resolution: "planned_new",
        residentId: null,
        residentProfileComparison: null,
        persistenceContract: {
            semanticType: "recipient_certificate",
            logicalSlot: "primary",
            semanticContent: {
                "user.name": "山田 太郎",
                "user.birth_date": "1984-03-27",
                "user.gender": "男性",
                "user.user_code": "U001",
                "recipient_certificate.certificate_number":
                    "1234567891"
            },
            contentHash: HASH_B,
            canonicalizationVersion:
                "risen-recipient-certificate-canonicalization-2",
            expectedContentHash: null
        }
    });

    const result = await service.execute(
        createPlan([entry])
    );

    assert.strictEqual(result.status, "completed");
    assert.strictEqual(atomicCalls.length, 1);

    assert.deepStrictEqual(
        atomicCalls[0].residentProfile,
        {
            name: "山田 太郎",
            birth_date: "1984-03-27",
            gender: "男性",
            user_code: "U001"
        }
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            atomicCalls[0].residentProfile,
            "certificate_number"
        ),
        false
    );
});
