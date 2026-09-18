"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordBatchWriteService =
    require("./ConnectorSupportRecordBatchWriteService");

function operation(index = 1) {
    return {
        action: "create",
        residentId: `resident-${index}`,
        sourceDocumentKey: "document-1",
        sourceRecordKey: `source-${index}`
    };
}

function createFastBatchService({
    batchImpl
} = {}) {
    return new ConnectorSupportRecordBatchWriteService({
        connectorTrustService: {
            async authenticate() {
                return {
                    status: "verified",
                    verifiedContext: {
                        facilityId:
                            "facility-verified",
                        connectorId:
                            "connector-verified"
                    }
                };
            }
        },
        persistenceService: {
            validate(operation) {
                return operation &&
                    operation.action === "create"
                    ? { status: "valid" }
                    : { status: "rejected" };
            },
            async persist() {
                throw new Error(
                    "single persistence must not run"
                );
            }
        },
        semanticRecordPersistenceRepository: {
            async persistBatch(input) {
                if (
                    typeof batchImpl !==
                    "function"
                ) {
                    throw new Error(
                        "batchImpl required"
                    );
                }

                return batchImpl(input);
            }
        }
    });
}

function createService({
    authenticateImpl = null,
    persistImpl = null,
    maxBatchSize = 100
} = {}) {
    const calls = {
        authenticate: [],
        persist: []
    };

    const connectorTrustService = {
        async authenticate(input) {
            calls.authenticate.push(input);

            if (authenticateImpl) {
                return authenticateImpl(input);
            }

            return {
                status: "verified",
                verifiedContext: {
                    facilityId: "facility-verified",
                    connectorId: "connector-verified"
                }
            };
        }
    };

    const persistenceService = {
        async persist(input) {
            calls.persist.push(input);

            if (persistImpl) {
                return persistImpl(input, calls.persist.length - 1);
            }

            return { status: "created" };
        }
    };

    return {
        service: new ConnectorSupportRecordBatchWriteService({
            connectorTrustService,
            persistenceService,
            maxBatchSize
        }),
        calls
    };
}

test("100 operations authenticate exactly once", async () => {
    const { service, calls } = createService();
    const operations = Array.from({ length: 100 }, (_, index) =>
        operation(index + 1)
    );

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations
    });

    assert.deepEqual(result, {
        status: "completed",
        processed: 100,
        created: 100,
        updated: 0,
        unchanged: 0
    });
    assert.equal(calls.authenticate.length, 1);
    assert.equal(calls.persist.length, 100);
});

test("100 valid creates use exactly one batch repository call", async () => {
    let trustCalls = 0;
    let validateCalls = 0;
    let persistCalls = 0;
    let batchCalls = 0;

    const service =
        new ConnectorSupportRecordBatchWriteService({
            connectorTrustService: {
                async authenticate() {
                    trustCalls += 1;
                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "facility-verified",
                            connectorId:
                                "connector-verified"
                        }
                    };
                }
            },
            persistenceService: {
                validate(value) {
                    validateCalls += 1;
                    return value.action === "create"
                        ? { status: "valid" }
                        : { status: "rejected" };
                },
                async persist() {
                    persistCalls += 1;
                    throw new Error(
                        "single persistence must not run"
                    );
                }
            },
            semanticRecordPersistenceRepository: {
                async persistBatch({
                    operations
                }) {
                    batchCalls += 1;
                    assert.equal(
                        operations.length,
                        100
                    );
                    return {
                        status: "completed",
                        processed: 100,
                        created: 100,
                        updated: 0,
                        unchanged: 0
                    };
                }
            }
        });

    const result =
        await service.write({
            connectorId: "connector-input",
            credential: "credential-input",
            operations:
                Array.from(
                    { length: 100 },
                    (_, index) => ({
                        action: "create",
                        index
                    })
                )
        });

    assert.equal(trustCalls, 1);
    assert.equal(validateCalls, 100);
    assert.equal(batchCalls, 1);
    assert.equal(persistCalls, 0);
    assert.deepEqual(result, {
        status: "completed",
        processed: 100,
        created: 100,
        updated: 0,
        unchanged: 0
    });
});

test("invalid create prevents batch repository call", async () => {
    let batchCalls = 0;
    let persistCalls = 0;

    const service =
        new ConnectorSupportRecordBatchWriteService({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "facility-verified",
                            connectorId:
                                "connector-verified"
                        }
                    };
                }
            },
            persistenceService: {
                validate(value) {
                    return value.valid === false
                        ? { status: "rejected" }
                        : { status: "valid" };
                },
                async persist() {
                    persistCalls += 1;
                    return {
                        status: "created"
                    };
                }
            },
            semanticRecordPersistenceRepository: {
                async persistBatch() {
                    batchCalls += 1;
                    return {
                        status: "completed",
                        processed: 2,
                        created: 2,
                        updated: 0,
                        unchanged: 0
                    };
                }
            }
        });

    const result =
        await service.write({
            connectorId: "connector-input",
            credential: "credential-input",
            operations: [
                {
                    action: "create"
                },
                {
                    action: "create",
                    valid: false
                }
            ]
        });

    assert.equal(batchCalls, 0);
    assert.equal(persistCalls, 0);
    assert.equal(result.status, "invalid");
    assert.equal(result.failedIndex, 1);
    assert.equal(result.processed, 0);
});

test("update presence keeps existing sequential persistence path", async () => {
    let batchCalls = 0;
    let persistCalls = 0;
    let validateCalls = 0;

    const service =
        new ConnectorSupportRecordBatchWriteService({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "facility-verified",
                            connectorId:
                                "connector-verified"
                        }
                    };
                }
            },
            persistenceService: {
                validate() {
                    validateCalls += 1;
                    return {
                        status: "valid"
                    };
                },
                async persist({
                    operation
                }) {
                    persistCalls += 1;
                    return {
                        status:
                            operation.action === "update"
                                ? "updated"
                                : "created"
                    };
                }
            },
            semanticRecordPersistenceRepository: {
                async persistBatch() {
                    batchCalls += 1;
                    throw new Error(
                        "batch repository must not run"
                    );
                }
            }
        });

    const result =
        await service.write({
            connectorId: "connector-input",
            credential: "credential-input",
            operations: [
                {
                    action: "create"
                },
                {
                    action: "update"
                }
            ]
        });

    assert.equal(batchCalls, 0);
    assert.equal(validateCalls, 0);
    assert.equal(persistCalls, 2);
    assert.deepEqual(result, {
        status: "completed",
        processed: 2,
        created: 1,
        updated: 1,
        unchanged: 0
    });
});

test("create batch conflict preserves exact committed prefix", async () => {
    const service =
        createFastBatchService({
            batchImpl: async () => ({
                status: "stopped",
                processed: 2,
                created: 1,
                updated: 0,
                unchanged: 1,
                failedIndex: 2,
                failureStatus: "conflict"
            })
        });

    assert.deepEqual(
        await service.write({
            connectorId: "connector-input",
            credential: "credential-input",
            operations: [
                { action: "create" },
                { action: "create" },
                { action: "create" }
            ]
        }),
        {
            status: "conflict",
            failedIndex: 2,
            processed: 2,
            created: 1,
            updated: 0,
            unchanged: 1
        }
    );
});

test("create batch resident mismatch preserves exact committed prefix", async () => {
    const service =
        createFastBatchService({
            batchImpl: async () => ({
                status: "stopped",
                processed: 1,
                created: 1,
                updated: 0,
                unchanged: 0,
                failedIndex: 1,
                failureStatus:
                    "resident_mismatch"
            })
        });

    const result =
        await service.write({
            connectorId: "connector-input",
            credential: "credential-input",
            operations: [
                { action: "create" },
                { action: "create" }
            ]
        });

    assert.equal(
        result.status,
        "resident_mismatch"
    );
    assert.equal(
        result.failedIndex,
        1
    );
    assert.equal(
        result.processed,
        1
    );
    assert.equal(
        result.created,
        1
    );
});

test("create batch transport failure invents no progress", async () => {
    const service =
        createFastBatchService({
            batchImpl: async () => {
                throw new Error(
                    "network"
                );
            }
        });

    assert.deepEqual(
        await service.write({
            connectorId: "connector-input",
            credential: "credential-input",
            operations: [
                { action: "create" },
                { action: "create" }
            ]
        }),
        {
            status: "error",
            failedIndex: 0,
            processed: 0,
            created: 0,
            updated: 0,
            unchanged: 0,
            errorCode:
                "support_record_batch_write_unavailable"
        }
    );
});

test("create batch unknown result is never accepted", async () => {
    const service =
        createFastBatchService({
            batchImpl: async () => ({
                status: "invented",
                processed: 2,
                created: 2,
                updated: 0,
                unchanged: 0
            })
        });

    const result =
        await service.write({
            connectorId: "connector-input",
            credential: "credential-input",
            operations: [
                { action: "create" },
                { action: "create" }
            ]
        });

    assert.equal(
        result.status,
        "error"
    );
    assert.equal(
        result.processed,
        0
    );
    assert.equal(
        result.errorCode,
        "support_record_batch_write_invalid_result"
    );
});

test("101 operations are rejected before trust or persistence", async () => {
    const { service, calls } = createService();
    const operations = Array.from({ length: 101 }, (_, index) =>
        operation(index + 1)
    );

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations
    });

    assert.equal(result.status, "invalid");
    assert.equal(result.errorCode, "support_record_batch_write_invalid");
    assert.equal(calls.authenticate.length, 0);
    assert.equal(calls.persist.length, 0);
});

test("verified context is the only authority for every operation", async () => {
    const first = {
        ...operation(1),
        facilityId: "facility-body",
        connectorId: "connector-body"
    };
    const second = operation(2);
    const { service, calls } = createService();

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [first, second]
    });

    assert.equal(result.status, "completed");
    assert.equal(calls.persist.length, 2);

    for (const call of calls.persist) {
        assert.deepEqual(call.verifiedContext, {
            facilityId: "facility-verified",
            connectorId: "connector-verified"
        });
    }
});

test("conflict stops before later operations", async () => {
    const { service, calls } = createService({
        persistImpl: async (input, index) => {
            if (index === 2) return { status: "conflict" };
            return { status: "created" };
        }
    });

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [
            operation(1),
            operation(2),
            operation(3),
            operation(4)
        ]
    });

    assert.deepEqual(result, {
        status: "conflict",
        failedIndex: 2,
        processed: 2,
        created: 2,
        updated: 0,
        unchanged: 0
    });
    assert.equal(calls.persist.length, 3);
});

test("resident mismatch stops before later operations", async () => {
    const { service, calls } = createService({
        persistImpl: async (input, index) =>
            index === 1
                ? { status: "resident_mismatch" }
                : { status: "created" }
    });

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [operation(1), operation(2), operation(3)]
    });

    assert.equal(result.status, "resident_mismatch");
    assert.equal(result.failedIndex, 1);
    assert.equal(result.processed, 1);
    assert.equal(calls.persist.length, 2);
});

test("persistence exception preserves completed counts and stops", async () => {
    const { service, calls } = createService({
        persistImpl: async (input, index) => {
            if (index === 0) return { status: "created" };
            if (index === 1) return { status: "updated" };
            throw new Error("database");
        }
    });

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [
            operation(1),
            operation(2),
            operation(3),
            operation(4)
        ]
    });

    assert.equal(result.status, "error");
    assert.equal(result.failedIndex, 2);
    assert.equal(result.processed, 2);
    assert.equal(result.created, 1);
    assert.equal(result.updated, 1);
    assert.equal(calls.persist.length, 3);
});

test("denied trust never reaches persistence", async () => {
    const { service, calls } = createService({
        authenticateImpl: async () => ({ status: "denied" })
    });

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [operation(1)]
    });

    assert.equal(result.status, "denied");
    assert.equal(result.errorCode, "connector_trust_denied");
    assert.equal(calls.authenticate.length, 1);
    assert.equal(calls.persist.length, 0);
});

test("rejected operation stops batch as invalid", async () => {
    const { service, calls } = createService({
        persistImpl: async (input, index) =>
            index === 1
                ? { status: "rejected" }
                : { status: "unchanged" }
    });

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [operation(1), operation(2), operation(3)]
    });

    assert.equal(result.status, "invalid");
    assert.equal(result.failedIndex, 1);
    assert.equal(result.processed, 1);
    assert.equal(result.unchanged, 1);
    assert.equal(calls.persist.length, 2);
});

test("trust dependency error preserves internal diagnostic code without persistence", async () => {
    const { service, calls } = createService({
        authenticateImpl: async () => ({
            status: "error",
            verifiedContext: null,
            errorCode:
                "connector_registration_unavailable"
        })
    });

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [operation(1)]
    });

    assert.deepEqual(result, {
        status: "error",
        errorCode:
            "connector_registration_unavailable"
    });
    assert.equal(calls.authenticate.length, 1);
    assert.equal(calls.persist.length, 0);
});

test("trust error without diagnostic code uses safe internal fallback", async () => {
    const { service, calls } = createService({
        authenticateImpl: async () => ({
            status: "error",
            verifiedContext: null
        })
    });

    const result = await service.write({
        connectorId: "connector-header",
        credential: "credential",
        operations: [operation(1)]
    });

    assert.deepEqual(result, {
        status: "error",
        errorCode:
            "connector_trust_unavailable"
    });
    assert.equal(calls.persist.length, 0);
});
