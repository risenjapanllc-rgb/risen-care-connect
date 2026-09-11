"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceDocumentPersistenceRepository =
    require("./SourceDocumentPersistenceRepository");

function validInput() {
    return {
        verifiedFacilityId: "facility-id",
        verifiedConnectorId: "connector-id",
        sourceDocumentKey: "source-document-key",
        sourceType: "csv",
        fileName: "source.csv",
        sourceContent: {
            sheetNames: ["Sheet1"],
            sheets: {
                Sheet1: [
                    ["A", "B"],
                    ["1", "2"]
                ]
            }
        },
        sourceUpdatedAt: "2026-09-11T10:00:00.000Z",
        sourceSize: 123,
        observedAt: "2026-09-11T10:01:00.000Z"
    };
}

test("rejects invalid source document persistence input", async () => {
    const repository =
        new SourceDocumentPersistenceRepository();

    const result =
        await repository.upsert({
            ...validInput(),
            verifiedFacilityId: ""
        });

    assert.deepStrictEqual(
        result,
        { status: "invalid" }
    );
});

test("accepts null sourceUpdatedAt and sourceSize", async () => {
    const repository =
        new SourceDocumentPersistenceRepository();

    await assert.rejects(
        repository.upsert({
            ...validInput(),
            sourceUpdatedAt: null,
            sourceSize: null
        }),
        /is not implemented/
    );
});

test("rejects non-object sourceContent", async () => {
    const repository =
        new SourceDocumentPersistenceRepository();

    const result =
        await repository.upsert({
            ...validInput(),
            sourceContent: []
        });

    assert.deepStrictEqual(
        result,
        { status: "invalid" }
    );
});

test("rejects negative sourceSize", async () => {
    const repository =
        new SourceDocumentPersistenceRepository();

    const result =
        await repository.upsert({
            ...validInput(),
            sourceSize: -1
        });

    assert.deepStrictEqual(
        result,
        { status: "invalid" }
    );
});

test("valid source document input reaches abstract implementation boundary", async () => {
    const repository =
        new SourceDocumentPersistenceRepository();

    await assert.rejects(
        repository.upsert(validInput()),
        /is not implemented/
    );
});
