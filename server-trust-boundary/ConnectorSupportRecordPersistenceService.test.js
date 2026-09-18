"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordPersistenceService =
    require("./ConnectorSupportRecordPersistenceService");

const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");

const HASH_A = "a".repeat(64);

const canonicalizer =
    new ConnectorSupportRecordCanonicalizer();

function canonical() {
    const result =
        canonicalizer.process({
            record_date: "2026-09-17",
            record_content: "記録",
            staff_name: null,
            record_category: null,
            created_at: null
        });

    return {
        contentHash:
            result.contentHash,
        canonicalizationVersion:
            result.canonicalizationVersion,
        semanticContent:
            result.semanticContent
    };
}

function context() {
    return {
        facilityId: "facility-1",
        connectorId: "connector-1"
    };
}

test("validate is side-effect free and shares create/update rules", async () => {
    let repositoryCalls = 0;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    repositoryCalls += 1;
                    return {
                        status: "created",
                        recordId:
                            "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    repositoryCalls += 1;
                    return {
                        status: "updated",
                        recordId:
                            "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const createResult =
        service.validate({
            action: "create",
            residentId:
                "11111111-1111-4111-8111-111111111111",
            sourceDocumentKey:
                "document-1",
            sourceRecordKey:
                "4163476",
            ...canonical()
        });

    const updateResult =
        service.validate({
            action: "update",
            recordId:
                "22222222-2222-4222-8222-222222222222",
            expectedContentHash:
                HASH_A,
            ...canonical()
        });

    const invalidResult =
        service.validate({
            action: "create",
            residentId:
                "not-a-uuid",
            sourceDocumentKey:
                "document-1",
            sourceRecordKey:
                "4163476",
            ...canonical()
        });

    assert.deepEqual(
        createResult,
        { status: "valid" }
    );
    assert.deepEqual(
        updateResult,
        { status: "valid" }
    );
    assert.deepEqual(
        invalidResult,
        { status: "rejected" }
    );
    assert.equal(
        repositoryCalls,
        0
    );
});

test("create persists a confirmed v2 record", async () => {
    let received = null;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord(input) {
                    received = input;
                    return {
                        status: "created",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    throw new Error("unexpected");
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "create",
                residentId: "11111111-1111-4111-8111-111111111111",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "4163476",
                ...canonical()
            }
        });

    assert.deepEqual(result, {
        status: "created"
    });

    assert.equal(
        received.verifiedFacilityId,
        "facility-1"
    );
    assert.equal(
        received.verifiedConnectorId,
        "connector-1"
    );
    assert.equal(
        received.sourceRecordKey,
        "4163476"
    );
});

test("create retry converges to unchanged", async () => {
    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    return {
                        status: "unchanged",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    throw new Error("unexpected");
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "create",
                residentId: "11111111-1111-4111-8111-111111111111",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "4163476",
                ...canonical()
            }
        });

    assert.deepEqual(result, {
        status: "unchanged"
    });
});

test("update uses optimistic expected content hash", async () => {
    let received = null;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error("unexpected");
                },
                async updateConfirmedRecord(input) {
                    received = input;
                    return {
                        status: "updated",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "update",
                recordId: "22222222-2222-4222-8222-222222222222",
                expectedContentHash: HASH_A,
                ...canonical()
            }
        });

    assert.deepEqual(result, {
        status: "updated"
    });

    assert.equal(
        received.expectedContentHash,
        HASH_A
    );
    assert.equal(
        received.contentHash,
        canonical().contentHash
    );
});

test("update conflict is never converted to success", async () => {
    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    throw new Error("unexpected");
                },
                async updateConfirmedRecord() {
                    return {
                        status: "conflict",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "update",
                recordId: "22222222-2222-4222-8222-222222222222",
                expectedContentHash: HASH_A,
                ...canonical()
            }
        });

    assert.deepEqual(result, {
        status: "conflict"
    });
});

test("resident mismatch is never converted to success", async () => {
    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    return {
                        status: "resident_mismatch",
                        recordId: null
                    };
                },
                async updateConfirmedRecord() {
                    throw new Error("unexpected");
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "create",
                residentId: "11111111-1111-4111-8111-111111111111",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "4163476",
                ...canonical()
            }
        });

    assert.deepEqual(result, {
        status: "resident_mismatch"
    });
});

test("create rejects invalid resident UUID before repository call", async () => {
    let called = false;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    called = true;
                    return {
                        status: "created",
                        recordId:
                            "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    called = true;
                    return {
                        status: "updated",
                        recordId:
                            "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "create",
                residentId: "not-a-uuid",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "4163476",
                ...canonical()
            }
        });

    assert.deepEqual(result, {
        status: "rejected"
    });
    assert.equal(called, false);
});

test("update rejects invalid record UUID before repository call", async () => {
    let called = false;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    called = true;
                    return {
                        status: "created",
                        recordId:
                            "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    called = true;
                    return {
                        status: "updated",
                        recordId:
                            "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "update",
                recordId: "not-a-uuid",
                expectedContentHash: HASH_A,
                ...canonical()
            }
        });

    assert.deepEqual(result, {
        status: "rejected"
    });
    assert.equal(called, false);
});

test("v1 canonicalization is rejected before repository call", async () => {
    let called = false;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    called = true;
                    return {
                        status: "created",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    called = true;
                    return {
                        status: "updated",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "create",
                residentId: "11111111-1111-4111-8111-111111111111",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "4163476",
                ...canonical(),
                canonicalizationVersion:
                    "risen-semantic-canonicalization-1"
            }
        });

    assert.deepEqual(result, {
        status: "rejected"
    });
    assert.equal(called, false);
});


test("tampered content hash is rejected before repository call", async () => {
    let called = false;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    called = true;
                    return {
                        status: "created",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    called = true;
                    return {
                        status: "updated",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const operation = {
        action: "create",
        residentId: "11111111-1111-4111-8111-111111111111",
        sourceDocumentKey: "document-1",
        sourceRecordKey: "4163476",
        ...canonical(),
        contentHash: HASH_A
    };

    const result =
        await service.persist({
            verifiedContext: context(),
            operation
        });

    assert.deepEqual(result, {
        status: "rejected"
    });
    assert.equal(called, false);
});

test("tampered semantic content is rejected before repository call", async () => {
    let called = false;

    const service =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository: {
                async createConfirmedRecord() {
                    called = true;
                    return {
                        status: "created",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                },
                async updateConfirmedRecord() {
                    called = true;
                    return {
                        status: "updated",
                        recordId: "22222222-2222-4222-8222-222222222222"
                    };
                }
            }
        });

    const value = canonical();

    value.semanticContent.fields.record_content =
        "改変された記録";

    const result =
        await service.persist({
            verifiedContext: context(),
            operation: {
                action: "create",
                residentId: "11111111-1111-4111-8111-111111111111",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "4163476",
                ...value
            }
        });

    assert.deepEqual(result, {
        status: "rejected"
    });
    assert.equal(called, false);
});
