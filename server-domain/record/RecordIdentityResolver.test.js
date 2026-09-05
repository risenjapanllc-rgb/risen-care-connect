const test = require("node:test");
const assert = require("node:assert/strict");

const RecordIdentityResolver = require("./RecordIdentityResolver");

function createIdentityContext(overrides = {}) {
    return {
        verifiedFacilityId: "facility-1",
        verifiedConnectorId: "connector-1",
        sourceDocumentKey: "document-key-1",
        sourceRecordKey: "record-key-1",
        ...overrides
    };
}

function resolve(identityContext = createIdentityContext(), providerOverrides = {}) {
    const calls = [];
    const provider = {
        findCandidates(scope) {
            calls.push(scope);
            return [];
        },
        ...providerOverrides
    };
    const resolver = new RecordIdentityResolver({
        recordIdentityCandidateProvider: provider
    });

    return { result: resolver.resolve(identityContext), calls };
}

test("an unambiguous candidate resolves using the trusted lookup scope", () => {
    const context = createIdentityContext();
    const calls = [];
    const resolver = new RecordIdentityResolver({
        recordIdentityCandidateProvider: {
            findCandidates(scope) {
                calls.push(scope);
                return [{ recordId: "record-1" }];
            }
        }
    });
    const result = resolver.resolve(context);

    assert.deepStrictEqual(result, { status: "resolved", recordId: "record-1" });
    assert.deepStrictEqual(calls, [{
        verifiedFacilityId: "facility-1",
        verifiedConnectorId: "connector-1",
        sourceDocumentKey: "document-key-1",
        sourceRecordKey: "record-key-1"
    }]);
});

test("zero candidates with complete source identity is a new candidate", () => {
    const { result } = resolve();

    assert.deepStrictEqual(result, { status: "new_candidate" });
    assert.strictEqual(result.recordId, undefined);
});

test("missing sourceRecordKey is pending review without generating a key", () => {
    const { result, calls } = resolve(createIdentityContext({
        sourceRecordKey: undefined,
        recordIdentityCandidate: { row: 3, paragraph: 2 }
    }));

    assert.deepStrictEqual(result, { status: "pending_review" });
    assert.strictEqual(result.recordId, undefined);
    assert.deepStrictEqual(calls, []);
});

test("missing trusted lookup scope is pending review", () => {
    for (const key of [
        "verifiedFacilityId",
        "verifiedConnectorId",
        "sourceDocumentKey"
    ]) {
        const { result, calls } = resolve(createIdentityContext({ [key]: undefined }));
        assert.deepStrictEqual(result, { status: "pending_review" }, key);
        assert.deepStrictEqual(calls, [], key);
    }
});

test("duplicate candidates produce conflict without a confirmed recordId", () => {
    const { result } = resolve(undefined, {
        findCandidates: () => [{ recordId: "record-1" }, { recordId: "record-2" }]
    });

    assert.deepStrictEqual(result, { status: "conflict" });
    assert.strictEqual(result.recordId, undefined);
});

test("contentHash and semantic data never enter identity lookup", () => {
    const context = createIdentityContext({
        contentHash: "a".repeat(64),
        semanticContent: { fields: { supportContent: "本文" } },
        wish: "希望",
        supportContent: "本文",
        longTermGoal: "目標",
        supportMethod: "方法",
        residentId: "resident-1",
        fileName: "support.docx",
        sourceUpdatedAt: "2026-09-05T10:00:00Z",
        sourceHash: "source-hash",
        credential: "credential",
        token: "token",
        password: "password",
        secret: "secret"
    });
    const { result, calls } = resolve(context);

    assert.deepStrictEqual(result, { status: "new_candidate" });
    assert.deepStrictEqual(Object.keys(calls[0]), [
        "verifiedFacilityId",
        "verifiedConnectorId",
        "sourceDocumentKey",
        "sourceRecordKey"
    ]);
});

test("contentHash, residentId, fileName, and sourceUpdatedAt alone do not resolve", () => {
    for (const context of [
        { contentHash: "a".repeat(64) },
        { residentId: "resident-1" },
        { fileName: "support.docx" },
        { sourceUpdatedAt: "2026-09-05T10:00:00Z" }
    ]) {
        const { result, calls } = resolve(context);
        assert.deepStrictEqual(result, { status: "pending_review" });
        assert.deepStrictEqual(calls, []);
    }
});

test("row, cell, and paragraph positions do not generate persistent keys", () => {
    const { result, calls } = resolve({
        verifiedFacilityId: "facility-1",
        verifiedConnectorId: "connector-1",
        sourceDocumentKey: "document-key-1",
        row: 3,
        cell: "B3",
        paragraph: 2
    });

    assert.deepStrictEqual(result, { status: "pending_review" });
    assert.deepStrictEqual(calls, []);
});

test("dependency throw and malformed result fail safely", () => {
    const thrown = resolve(undefined, {
        findCandidates() {
            throw new Error("internal lookup detail");
        }
    }).result;
    const malformed = resolve(undefined, {
        findCandidates: () => ({ recordId: "record-1" })
    }).result;
    const malformedCandidate = resolve(undefined, {
        findCandidates: () => [{ recordId: "" }]
    }).result;

    assert.deepStrictEqual(thrown, {
        status: "invalid",
        errorCode: "record_identity_lookup_failed"
    });
    assert.deepStrictEqual(malformed, {
        status: "invalid",
        errorCode: "record_identity_candidates_invalid"
    });
    assert.deepStrictEqual(malformedCandidate, {
        status: "invalid",
        errorCode: "record_identity_candidates_invalid"
    });
});

test("input is not mutated", () => {
    const context = createIdentityContext({ contentHash: "untrusted" });
    const before = JSON.stringify(context);

    resolve(context);

    assert.strictEqual(JSON.stringify(context), before);
});

test("record identity does not create a recordId from the input", () => {
    const { result } = resolve(createIdentityContext({ recordId: "client-record-id" }));

    assert.deepStrictEqual(result, { status: "new_candidate" });
});