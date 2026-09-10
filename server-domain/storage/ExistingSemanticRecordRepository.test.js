"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ExistingSemanticRecordRepository =
    require("./ExistingSemanticRecordRepository");

test("missing facilityId returns null", async () => {
    const repository =
        new ExistingSemanticRecordRepository();

    assert.strictEqual(
        await repository.getByRecordId({
            recordId: "record-1"
        }),
        null
    );
});

test("missing recordId returns null", async () => {
    const repository =
        new ExistingSemanticRecordRepository();

    assert.strictEqual(
        await repository.getByRecordId({
            facilityId: "facility-1"
        }),
        null
    );
});

test("blank lookup scope returns null", async () => {
    const repository =
        new ExistingSemanticRecordRepository();

    for (const input of [
        {},
        {
            facilityId: "",
            recordId: "record-1"
        },
        {
            facilityId: "   ",
            recordId: "record-1"
        },
        {
            facilityId: "facility-1",
            recordId: ""
        },
        {
            facilityId: "facility-1",
            recordId: "   "
        }
    ]) {
        assert.strictEqual(
            await repository.getByRecordId(
                input
            ),
            null
        );
    }
});

test("complete trusted lookup scope reaches implementation boundary", async () => {
    const repository =
        new ExistingSemanticRecordRepository();

    await assert.rejects(
        () =>
            repository.getByRecordId({
                facilityId: "facility-1",
                recordId: "record-1"
            }),
        /not yet implemented/
    );
});

test("repository exposes only scoped lookup operation", () => {
    const repository =
        new ExistingSemanticRecordRepository();

    assert.strictEqual(
        typeof repository.getByRecordId,
        "function"
    );

    assert.strictEqual(
        repository.getByContentHash,
        undefined
    );

    assert.strictEqual(
        repository.getBySourceDocumentKey,
        undefined
    );

    assert.strictEqual(
        repository.findCandidates,
        undefined
    );
});
