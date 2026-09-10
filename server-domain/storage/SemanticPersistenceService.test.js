"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticPersistenceService =
    require("./SemanticPersistenceService");

const OLD_HASH = "a".repeat(64);
const NEW_HASH = "b".repeat(64);
const VERSION =
    "risen-semantic-canonicalization-1";

function createInput({
    decisionStatus =
        "confirmed_candidate",
    changeStatus =
        "updated_candidate"
} = {}) {
    return {
        verifiedContext: {
            facilityId: "facility-1",
            connectorId: "connector-1"
        },
        semanticPipeline: {
            status: "resolved",
            identityResolution: {
                status: "resolved",
                recordId: "record-1"
            },
            processedSemanticRecord: {
                contentHash: NEW_HASH,
                processingMetadata: {
                    canonicalizationVersion:
                        VERSION
                },
                semanticContent: {
                    semanticType:
                        "support_record",
                    fields: {
                        supportContent:
                            "支援内容"
                    },
                    customFields: {}
                }
            }
        },
        persistenceDecision: {
            decision: {
                status: decisionStatus
            },
            ...(decisionStatus ===
                "confirmed_candidate"
                ? {
                    recordChange: {
                        status: changeStatus,
                        recordId:
                            "record-1",
                        ...(changeStatus ===
                            "updated_candidate"
                            ? {
                                expectedContentHash:
                                    OLD_HASH
                            }
                            : {})
                    }
                }
                : {})
        }
    };
}

test("updated confirmed candidate calls repository with exact trusted update contract", async () => {
    const calls = [];

    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                },
                async updateConfirmedRecord(
                    input
                ) {
                    calls.push(input);

                    return {
                        status: "updated",
                        recordId:
                            "record-1"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await service.persist(
            createInput()
        ),
        {
            status: "updated"
        }
    );

    assert.deepStrictEqual(
        calls,
        [
            {
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                recordId:
                    "record-1",
                expectedContentHash:
                    OLD_HASH,
                contentHash:
                    NEW_HASH,
                canonicalizationVersion:
                    VERSION,
                semanticContent: {
                    semanticType:
                        "support_record",
                    fields: {
                        supportContent:
                            "支援内容"
                    },
                    customFields: {}
                }
            }
        ]
    );
});

test("unchanged confirmed candidate does not write", async () => {
    let calls = 0;

    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                },
                async updateConfirmedRecord() {
                    calls += 1;
                    return {
                        status: "updated"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await service.persist(
            createInput({
                changeStatus:
                    "unchanged_candidate"
            })
        ),
        {
            status: "unchanged"
        }
    );

    assert.strictEqual(calls, 0);
});

test("non-confirmed decision never writes", async () => {
    let calls = 0;

    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                },
                async updateConfirmedRecord() {
                    calls += 1;
                }
            }
        });

    for (const decisionStatus of [
        "pending_review",
        "conflict",
        "rejected"
    ]) {
        assert.deepStrictEqual(
            await service.persist(
                createInput({
                    decisionStatus
                })
            ),
            {
                status: "not_required"
            }
        );
    }

    assert.strictEqual(calls, 0);
});

test("client-like fields cannot override trusted persistence input", async () => {
    let repositoryInput;

    const input =
        createInput();

    input.facilityId =
        "attacker-facility";

    input.connectorId =
        "attacker-connector";

    input.recordId =
        "attacker-record";

    input.expectedContentHash =
        "c".repeat(64);

    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                },
                async updateConfirmedRecord(
                    value
                ) {
                    repositoryInput = value;

                    return {
                        status: "updated",
                        recordId:
                            "record-1"
                    };
                }
            }
        });

    await service.persist(input);

    assert.strictEqual(
        repositoryInput
            .verifiedFacilityId,
        "facility-1"
    );

    assert.strictEqual(
        repositoryInput
            .verifiedConnectorId,
        "connector-1"
    );

    assert.strictEqual(
        repositoryInput.recordId,
        "record-1"
    );

    assert.strictEqual(
        repositoryInput
            .expectedContentHash,
        OLD_HASH
    );
});

test("record identity mismatch fails closed before write", async () => {
    let calls = 0;

    const input =
        createInput();

    input.persistenceDecision
        .recordChange.recordId =
        "other-record";

    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                },
                async updateConfirmedRecord() {
                    calls += 1;
                }
            }
        });

    assert.deepStrictEqual(
        await service.persist(input),
        {
            status: "rejected"
        }
    );

    assert.strictEqual(calls, 0);
});

test("repository conflict is preserved while denied and malformed results reject", async () => {
    for (const [
        repositoryResult,
        expected
    ] of [
        [
            {
                status: "conflict",
                recordId: "record-1"
            },
            {
                status: "conflict"
            }
        ],
        [
            {
                status: "denied"
            },
            {
                status: "rejected"
            }
        ],
        [
            {
                status: "not_found"
            },
            {
                status: "rejected"
            }
        ],
        [
            {
                status: "invalid"
            },
            {
                status: "rejected"
            }
        ],
        [
            {
                unexpected: true
            },
            {
                status: "rejected"
            }
        ]
    ]) {
        const service =
            new SemanticPersistenceService({
                semanticRecordPersistenceRepository: {
                    async createConfirmedRecord() {
                        throw new Error(
                            "must not be called"
                        );
                    },
                    async updateConfirmedRecord() {
                        return repositoryResult;
                    }
                }
            });

        assert.deepStrictEqual(
            await service.persist(
                createInput()
            ),
            expected
        );
    }
});

test("repository exception is sanitized", async () => {
    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                },
                async updateConfirmedRecord() {
                    throw new Error(
                        "database secret failure"
                    );
                }
            }
        });

    const result =
        await service.persist(
            createInput()
        );

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        JSON.stringify(result)
            .includes("secret"),
        false
    );
});

test("constructor requires persistence repository", () => {
    assert.throws(
        () =>
            new SemanticPersistenceService(),
        /semanticRecordPersistenceRepository/
    );
});
