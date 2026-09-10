"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecordIdentityCandidateProvider =
    require("./RecordIdentityCandidateProvider");

test("incomplete trusted lookup scope returns empty candidates", () => {
    const provider =
        new RecordIdentityCandidateProvider();

    assert.deepStrictEqual(
        provider.findCandidates({
            verifiedFacilityId: "facility-1",
            verifiedConnectorId: "connector-1",
            sourceDocumentKey: "document-1"
        }),
        []
    );
});

test("blank trusted lookup scope returns empty candidates", () => {
    const provider =
        new RecordIdentityCandidateProvider();

    assert.deepStrictEqual(
        provider.findCandidates({
            verifiedFacilityId: "facility-1",
            verifiedConnectorId: "connector-1",
            sourceDocumentKey: "document-1",
            sourceRecordKey: "   "
        }),
        []
    );
});

test("complete trusted lookup scope reaches implementation boundary", () => {
    const provider =
        new RecordIdentityCandidateProvider();

    assert.throws(
        () =>
            provider.findCandidates({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                sourceDocumentKey:
                    "document-1",
                sourceRecordKey:
                    "record-source-1"
            }),
        /not yet implemented/
    );
});

test("provider exposes only scoped candidate lookup operation", () => {
    const provider =
        new RecordIdentityCandidateProvider();

    assert.strictEqual(
        typeof provider.findCandidates,
        "function"
    );

    assert.strictEqual(
        provider.findByContentHash,
        undefined
    );

    assert.strictEqual(
        provider.findByResidentId,
        undefined
    );

    assert.strictEqual(
        provider.findByFileName,
        undefined
    );

    assert.strictEqual(
        provider.findByRecordId,
        undefined
    );
});
