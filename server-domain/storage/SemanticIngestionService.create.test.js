"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticIngestionService =
    require("./SemanticIngestionService");
const SemanticStorageDecisionService =
    require("./SemanticStorageDecisionService");
const SemanticPersistenceService =
    require("./SemanticPersistenceService");
const SemanticStoragePolicy =
    require("./SemanticStoragePolicy");

const HASH = "c".repeat(64);
const VERSION =
    "risen-semantic-canonicalization-1";

function createService({
    persistenceResult,
    persistenceCalls
}) {
    const semanticStorageDecisionService =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    throw new Error(
                        "new candidate must not load existing record"
                    );
                }
            },
            recordChangeResolver: {
                resolve() {
                    throw new Error(
                        "new candidate must not resolve record change"
                    );
                }
            },
            semanticStoragePolicy:
                new SemanticStoragePolicy()
        });

    const semanticPersistenceService =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord(
                    input
                ) {
                    persistenceCalls.push(
                        input
                    );

                    return persistenceResult;
                },
                async updateConfirmedRecord() {
                    throw new Error(
                        "new candidate must not update"
                    );
                }
            }
        });

    return new SemanticIngestionService({
        semanticRecordPipeline: {
            async process() {
                return {
                    status:
                        "new_candidate",
                    identityResolution: {
                        status:
                            "new_candidate"
                    },
                    processedSemanticRecord: {
                        provenance: {
                            sourceDocumentKey:
                                "document-application-create"
                        },
                        sourceRecordContext: {
                            sourceRecordKey:
                                "support_record:primary"
                        },
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
                                    "Application CREATE lifecycle"
                            },
                            customFields: {}
                        }
                    }
                };
            }
        },
        semanticStorageDecisionService,
        semanticPersistenceService
    });
}

function createInput() {
    return {
        verifiedContext: {
            facilityId:
                "facility-1",
            connectorId:
                "connector-1"
        },
        residentMatching: {
            status:
                "matched",
            residentId:
                "resident-1"
        },
        semanticRecord: {
            residentId:
                "client-resident-must-not-win",
            facilityId:
                "client-facility-must-not-win"
        }
    };
}

test("application lifecycle persists matched new candidate through trusted CREATE", async () => {
    const persistenceCalls = [];

    const service =
        createService({
            persistenceResult: {
                status:
                    "created",
                recordId:
                    "record-new"
            },
            persistenceCalls
        });

    assert.deepStrictEqual(
        await service.ingest(
            createInput()
        ),
        {
            status:
                "confirmed_candidate"
        }
    );

    assert.deepStrictEqual(
        persistenceCalls,
        [
            {
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                residentId:
                    "resident-1",
                sourceDocumentKey:
                    "document-application-create",
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
                            "Application CREATE lifecycle"
                    },
                    customFields: {}
                }
            }
        ]
    );
});

test("application lifecycle preserves atomic CREATE conflict", async () => {
    const persistenceCalls = [];

    const service =
        createService({
            persistenceResult: {
                status:
                    "conflict"
            },
            persistenceCalls
        });

    assert.deepStrictEqual(
        await service.ingest(
            createInput()
        ),
        {
            status:
                "conflict"
        }
    );

    assert.equal(
        persistenceCalls.length,
        1
    );
});
