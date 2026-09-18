"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const ConnectorSupportRecordExecutionService =
    require("./ConnectorSupportRecordExecutionService");

function hash(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function semanticContent(content) {
    return {
        semanticType: "support_record",
        fields: {
            record_date: "2026-09-17",
            record_content: content,
            staff_name: null,
            record_category: null,
            created_at: null
        },
        customFields: {}
    };
}

function planEntry({
    key = "source-1",
    action = "new",
    recordId = null,
    baselineHash = null
} = {}) {
    const targetSemanticContent = semanticContent(`target-${key}`);
    const targetHash = hash(JSON.stringify(targetSemanticContent));

    return {
        sourceRecordKey: key,
        residentId: `resident-${key}`,
        action,
        recordId,
        baselineHash,
        targetHash,
        targetSemanticContent,
        canonicalizationVersion: "risen-semantic-canonicalization-2"
    };
}

function createService({
    lookupRecords = [],
    lookupImpl = null,
    writeImpl = null,
    writeBatchSize = 100
} = {}) {
    const calls = { lookup: [], write: [] };

    const semanticRecordPreviewClient = {
        async lookup(input) {
            calls.lookup.push(input);
            if (lookupImpl) return lookupImpl(input);
            return { status: "found", records: lookupRecords };
        }
    };

    const batchWriteClient = {
        async write(operations) {
            calls.write.push(operations);
            if (writeImpl) return writeImpl(operations, calls.write.length - 1);
            return {
                status: "completed",
                processed: operations.length,
                created: operations.filter(item => item.action === "create").length,
                updated: operations.filter(item => item.action === "update").length,
                unchanged: 0
            };
        }
    };

    return {
        service: new ConnectorSupportRecordExecutionService({
            semanticRecordPreviewClient,
            batchWriteClient,
            writeBatchSize
        }),
        calls
    };
}

test("new row becomes exact create operation in one batch", async () => {
    const entry = planEntry();
    const { service, calls } = createService();

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: [entry]
    });

    assert.deepEqual(result, {
        status: "completed",
        processed: 1,
        created: 1,
        updated: 0,
        alreadyApplied: 0
    });

    assert.equal(calls.write.length, 1);
    assert.deepEqual(calls.write[0], [{
        action: "create",
        residentId: entry.residentId,
        sourceDocumentKey: "document-1",
        sourceRecordKey: entry.sourceRecordKey,
        contentHash: entry.targetHash,
        canonicalizationVersion: entry.canonicalizationVersion,
        semanticContent: entry.targetSemanticContent
    }]);
});

test("update at verified baseline becomes optimistic batch update", async () => {
    const baselineContent = semanticContent("baseline");
    const baselineHash = hash(JSON.stringify(baselineContent));
    const entry = planEntry({
        action: "update",
        recordId: "record-1",
        baselineHash
    });

    const current = {
        sourceRecordKey: entry.sourceRecordKey,
        recordId: "record-1",
        residentId: entry.residentId,
        semanticType: "support_record",
        semanticContent: baselineContent,
        contentHash: baselineHash,
        canonicalizationVersion: "risen-semantic-canonicalization-2"
    };

    const { service, calls } = createService({
        lookupRecords: [current]
    });

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: [entry]
    });

    assert.equal(result.status, "completed");
    assert.equal(result.updated, 1);
    assert.equal(calls.write.length, 1);
    assert.equal(calls.write[0][0].action, "update");
    assert.equal(calls.write[0][0].recordId, "record-1");
    assert.equal(calls.write[0][0].expectedContentHash, baselineHash);
});

test("already applied target performs no batch write", async () => {
    const entry = planEntry();
    const current = {
        sourceRecordKey: entry.sourceRecordKey,
        recordId: "record-1",
        residentId: entry.residentId,
        semanticType: "support_record",
        semanticContent: entry.targetSemanticContent,
        contentHash: entry.targetHash,
        canonicalizationVersion: entry.canonicalizationVersion
    };

    const { service, calls } = createService({
        lookupRecords: [current]
    });

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: [entry]
    });

    assert.deepEqual(result, {
        status: "completed",
        processed: 1,
        created: 0,
        updated: 0,
        alreadyApplied: 1
    });
    assert.equal(calls.write.length, 0);
});

test("batch conflict preserves partial counts and failed source key", async () => {
    const entries = [
        planEntry({ key: "source-1" }),
        planEntry({ key: "source-2" }),
        planEntry({ key: "source-3" }),
        planEntry({ key: "source-4" })
    ];

    const { service, calls } = createService({
        writeImpl: async () => ({
            status: "conflict",
            failedIndex: 2,
            processed: 2,
            created: 2,
            updated: 0,
            unchanged: 0
        })
    });

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: entries
    });

    assert.equal(result.status, "conflict");
    assert.equal(result.sourceRecordKey, "source-3");
    assert.equal(result.processed, 2);
    assert.equal(result.created, 2);
    assert.equal(calls.write.length, 1);
    assert.equal(calls.write[0].length, 4);
});

test("network failure does not invent batch write progress", async () => {
    const entries = [
        planEntry({ key: "source-1" }),
        planEntry({ key: "source-2" })
    ];

    const { service, calls } = createService({
        writeImpl: async () => {
            throw new Error("network");
        }
    });

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: entries
    });

    assert.equal(result.status, "error");
    assert.equal(result.sourceRecordKey, "source-1");
    assert.equal(result.processed, 0);
    assert.equal(result.created, 0);
    assert.equal(calls.write.length, 1);
});

test("501 rows use 500 plus 1 lookup and 100 write batches", async () => {
    const executionPlan = Array.from({ length: 501 }, (_, index) =>
        planEntry({ key: `source-${index + 1}` })
    );

    const { service, calls } = createService();

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan
    });

    assert.equal(result.status, "completed");
    assert.equal(result.created, 501);
    assert.equal(calls.lookup.length, 2);
    assert.equal(calls.lookup[0].sourceRecordKeys.length, 500);
    assert.equal(calls.lookup[1].sourceRecordKeys.length, 1);
    assert.deepEqual(
        calls.write.map(batch => batch.length),
        [100, 100, 100, 100, 100, 1]
    );
});

test("planned unchanged row is treated as already applied without write", async () => {
    const entry = planEntry();

    entry.action = "unchanged";
    entry.recordId = "record-1";
    entry.baselineHash = entry.targetHash;

    const current = {
        sourceRecordKey: entry.sourceRecordKey,
        recordId: entry.recordId,
        residentId: entry.residentId,
        semanticType: "support_record",
        semanticContent: entry.targetSemanticContent,
        contentHash: entry.targetHash,
        canonicalizationVersion:
            entry.canonicalizationVersion
    };

    const { service, calls } = createService({
        lookupRecords: [current]
    });

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: [entry]
    });

    assert.deepEqual(result, {
        status: "completed",
        processed: 1,
        created: 0,
        updated: 0,
        alreadyApplied: 1
    });

    assert.equal(calls.write.length, 0);
});

test("already applied rows are excluded from write batch", async () => {
    const entries = Array.from({ length: 5 }, (_, index) =>
        planEntry({ key: `source-${index + 1}` })
    );

    const current = entries.slice(0, 2).map((entry, index) => ({
        sourceRecordKey: entry.sourceRecordKey,
        recordId: `record-${index + 1}`,
        residentId: entry.residentId,
        semanticType: "support_record",
        semanticContent: entry.targetSemanticContent,
        contentHash: entry.targetHash,
        canonicalizationVersion: entry.canonicalizationVersion
    }));

    const { service, calls } = createService({
        lookupRecords: current
    });

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: entries
    });

    assert.equal(result.status, "completed");
    assert.equal(result.processed, 5);
    assert.equal(result.created, 3);
    assert.equal(result.alreadyApplied, 2);
    assert.equal(calls.write.length, 1);
    assert.equal(calls.write[0].length, 3);
    assert.deepEqual(
        calls.write[0].map(item => item.sourceRecordKey),
        ["source-3", "source-4", "source-5"]
    );
});

test("unchanged batch result counts as already applied", async () => {
    const entries = [
        planEntry({ key: "source-1" }),
        planEntry({ key: "source-2" })
    ];

    const { service } = createService({
        writeImpl: async operations => ({
            status: "completed",
            processed: operations.length,
            created: 1,
            updated: 0,
            unchanged: 1
        })
    });

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan: entries
    });

    assert.deepEqual(result, {
        status: "completed",
        processed: 2,
        created: 1,
        updated: 0,
        alreadyApplied: 1
    });
});

test("duplicate identity across lookup boundary is rejected before I/O", async () => {
    const executionPlan = Array.from({ length: 501 }, (_, index) =>
        planEntry({ key: `source-${index + 1}` })
    );

    executionPlan[500] = planEntry({ key: "source-1" });

    const { service, calls } = createService();

    const result = await service.execute({
        sourceDocumentKey: "document-1",
        executionPlan
    });

    assert.deepEqual(result, { status: "invalid" });
    assert.equal(calls.lookup.length, 0);
    assert.equal(calls.write.length, 0);
});
