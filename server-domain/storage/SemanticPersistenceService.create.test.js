"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticPersistenceService =
    require("./SemanticPersistenceService");

const HASH = "b".repeat(64);
const VERSION =
    "risen-semantic-canonicalization-1";

function createInput() {
    return {
        verifiedContext: {
            facilityId:
                "facility-1",
            connectorId:
                "connector-1"
        },
        semanticPipeline: {
            status:
                "new_candidate",
            identityResolution: {
                status:
                    "new_candidate"
            },
            processedSemanticRecord: {
                contentHash:
                    HASH,
                processingMetadata: {
                    canonicalizationVersion:
                        VERSION
                },
                semanticContent: {
                    semanticType:
                        "support_record",
                    fields: {
                        supportContent:
                            "新規支援内容"
                    },
                    customFields: {}
                }
            }
        },
        persistenceDecision: {
            decision: {
                status:
                    "confirmed_candidate"
            },
            recordCreation: {
                status:
                    "create_candidate",
                residentId:
                    "resident-1",
                sourceDocumentKey:
                    "document-1",
                sourceRecordKey:
                    "support_record:primary"
            }
        }
    };
}

test("confirmed new candidate uses exact trusted CREATE contract", async () => {
    const calls = [];

    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord(input) {
                    calls.push(input);

                    return {
                        status:
                            "created",
                        recordId:
                            "record-new"
                    };
                },
                async updateConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                }
            }
        });

    assert.deepStrictEqual(
        await service.persist(
            createInput()
        ),
        {
            status:
                "created"
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
                residentId:
                    "resident-1",
                sourceDocumentKey:
                    "document-1",
                sourceRecordKey:
                    "support_record:primary",
                contentHash:
                    HASH,
                canonicalizationVersion:
                    VERSION,
                semanticContent: {
                    semanticType:
                        "support_record",
                    fields: {
                        supportContent:
                            "新規支援内容"
                    },
                    customFields: {}
                }
            }
        ]
    );
});

test("idempotent repeated CREATE may return unchanged", async () => {
    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    return {
                        status:
                            "unchanged",
                        recordId:
                            "record-new"
                    };
                },
                async updateConfirmedRecord() {
                    throw new Error(
                        "must not be called"
                    );
                }
            }
        });

    assert.deepStrictEqual(
        await service.persist(
            createInput()
        ),
        {
            status:
                "unchanged"
        }
    );
});

test("malformed trusted CREATE context fails closed without write", async () => {
    let createCalls = 0;
    let updateCalls = 0;

    const service =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    createCalls += 1;
                    return {
                        status:
                            "created"
                    };
                },
                async updateConfirmedRecord() {
                    updateCalls += 1;
                    return {
                        status:
                            "updated"
                    };
                }
            }
        });

    for (const field of [
        "residentId",
        "sourceDocumentKey",
        "sourceRecordKey"
    ]) {
        const input =
            createInput();

        input.persistenceDecision
            .recordCreation[field] = "";

        assert.deepStrictEqual(
            await service.persist(input),
            {
                status:
                    "rejected"
            }
        );
    }

    assert.equal(createCalls, 0);
    assert.equal(updateCalls, 0);
});

test("CREATE repository conflict is preserved and denied is rejected", async () => {
    for (const [
        repositoryStatus,
        expected
    ] of [
        [
            "conflict",
            {
                status:
                    "conflict"
            }
        ],
        [
            "denied",
            {
                status:
                    "rejected"
            }
        ],
        [
            "resident_mismatch",
            {
                status:
                    "rejected"
            }
        ]
    ]) {
        const service =
            new SemanticPersistenceService({
                semanticRecordPersistenceRepository: {
                    async createConfirmedRecord() {
                        return {
                            status:
                                repositoryStatus
                        };
                    },
                    async updateConfirmedRecord() {
                        throw new Error(
                            "must not be called"
                        );
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
