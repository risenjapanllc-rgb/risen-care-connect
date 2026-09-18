"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./SourceRecordIdentityPersistenceService");

const input = {
    sourceDocumentKey: "document-1",
    sourceUpdatedAt:
        "2026-09-17T00:00:00.000Z",
    sourceSize: 100,
    sourceFieldKey:
        "sheet:0:column:0"
};

function validResult() {
    return {
        status: "valid",
        sourceDocumentKey:
            "document-1",
        sourceUpdatedAt:
            "2026-09-17T00:00:00.000Z",
        sourceSize: 100,
        sourceFieldKey:
            "sheet:0:column:0",
        sheetName: "csv",
        headerLabel: "ID",
        sourceEntityCount: 94198,
        uniqueValueCount: 94198
    };
}

test("persists only after exact snapshot identity validation succeeds", async () => {
    const calls = [];

    const service =
        new Service({
            confirmationService: {
                async validate(received) {
                    assert.deepStrictEqual(
                        received,
                        input
                    );

                    return validResult();
                }
            },
            sourceRecordIdentityMappingClient: {
                async save(mapping) {
                    calls.push(mapping);

                    return {
                        status: "created"
                    };
                }
            },
            now: () =>
                new Date(
                    "2026-09-17T02:00:00.000Z"
                )
        });

    const result =
        await service.confirm(input);

    assert.equal(calls.length, 1);

    assert.deepStrictEqual(
        calls[0],
        {
            sourceDocumentKey:
                "document-1",
            sourceFieldKey:
                "sheet:0:column:0",
            sheetName: "csv",
            headerLabel: "ID",
            confirmedAt:
                "2026-09-17T02:00:00.000Z",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100
        }
    );

    assert.deepStrictEqual(
        result,
        {
            status: "confirmed",
            persistenceStatus:
                "created",
            mapping: {
                sourceFieldKey:
                    "sheet:0:column:0",
                sheetName: "csv",
                headerLabel: "ID",
                confirmedAt:
                    "2026-09-17T02:00:00.000Z"
            },
            validation: {
                sourceEntityCount: 94198,
                uniqueValueCount: 94198
            }
        }
    );
});

test("does not persist when identity validation fails", async () => {
    let saveCount = 0;

    const service =
        new Service({
            confirmationService: {
                async validate() {
                    return {
                        status: "invalid",
                        errorCode:
                            "source_record_identity_not_unique",
                        sourceEntityCount: 3,
                        duplicateValueCount: 1,
                        uniqueValueCount: 2
                    };
                }
            },
            sourceRecordIdentityMappingClient: {
                async save() {
                    saveCount += 1;

                    return {
                        status: "created"
                    };
                }
            }
        });

    const result =
        await service.confirm(input);

    assert.equal(saveCount, 0);
    assert.equal(
        result.status,
        "invalid"
    );
    assert.equal(
        result.errorCode,
        "source_record_identity_not_unique"
    );
});

test("does not persist blank identity validation result", async () => {
    let saveCount = 0;

    const service =
        new Service({
            confirmationService: {
                async validate() {
                    return {
                        status: "invalid",
                        errorCode:
                            "source_record_identity_value_missing",
                        blankValueCount: 1
                    };
                }
            },
            sourceRecordIdentityMappingClient: {
                async save() {
                    saveCount += 1;
                }
            }
        });

    const result =
        await service.confirm(input);

    assert.equal(saveCount, 0);
    assert.equal(
        result.errorCode,
        "source_record_identity_value_missing"
    );
});

test("propagates persistence failure without reporting confirmed", async () => {
    const service =
        new Service({
            confirmationService: {
                async validate() {
                    return validResult();
                }
            },
            sourceRecordIdentityMappingClient: {
                async save() {
                    const error =
                        new Error(
                            "persistence unavailable"
                        );

                    error.code =
                        "connector_processing_unavailable";

                    throw error;
                }
            }
        });

    await assert.rejects(
        service.confirm(input),
        error =>
            error.code ===
            "connector_processing_unavailable"
    );
});

test("rejects invalid confirmation clock before persistence", async () => {
    let saveCount = 0;

    const service =
        new Service({
            confirmationService: {
                async validate() {
                    return validResult();
                }
            },
            sourceRecordIdentityMappingClient: {
                async save() {
                    saveCount += 1;
                }
            },
            now: () =>
                new Date("invalid")
        });

    await assert.rejects(
        service.confirm(input),
        /confirmation time is unavailable/
    );

    assert.equal(saveCount, 0);
});
