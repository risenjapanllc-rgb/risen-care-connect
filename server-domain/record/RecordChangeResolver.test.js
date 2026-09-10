const test = require("node:test");
const assert = require("node:assert/strict");

const RecordChangeResolver = require("./RecordChangeResolver");

const CURRENT_HASH = "a".repeat(64);
const EXISTING_HASH = "b".repeat(64);
const VERSION = "risen-semantic-canonicalization-1";

function createChangeContext(overrides = {}) {
    return {
        identityResolution: {
            status: "resolved",
            recordId: "record-1"
        },
        currentContentHash: CURRENT_HASH,
        currentCanonicalizationVersion: VERSION,
        existingRecordState: {
            recordId: "record-1",
            contentHash: CURRENT_HASH,
            canonicalizationVersion: VERSION
        },
        ...overrides
    };
}

function resolve(changeContext = createChangeContext(), policyOverrides = {}) {
    const calls = [];
    const policy = {
        evaluate(versions) {
            calls.push(versions);
            return { status: "compatible" };
        },
        ...policyOverrides
    };
    const resolver = new RecordChangeResolver({
        canonicalizationCompatibilityPolicy: policy
    });

    return { result: resolver.resolve(changeContext), calls };
}

test("resolved identity, compatible versions, and same hash => unchanged candidate", () => {
    const { result } = resolve();

    assert.deepStrictEqual(result, {
        status: "unchanged_candidate",
        recordId: "record-1"
    });
});

test("resolved identity, compatible versions, and different hash => updated candidate", () => {
    const { result } = resolve(createChangeContext({
        currentContentHash: EXISTING_HASH
    }));

    assert.deepStrictEqual(result, {
        status: "updated_candidate",
        recordId: "record-1",
            expectedContentHash:
                "a".repeat(64)
    });
});

test("Policy receives only the two canonicalization versions", () => {
    const context = createChangeContext({
        semanticContent: { fields: { supportContent: "本文" } },
        contentHash: "untrusted",
        facilityId: "facility-1",
        residentId: "resident-1",
        sourceRecordKey: "source-record-1",
        fileName: "support.docx",
        sourceUpdatedAt: "2026-09-05T10:00:00Z",
        sourceHash: "source-hash",
        credential: "credential",
        token: "token",
        password: "password",
        secret: "secret"
    });
    const { calls } = resolve(context);

    assert.deepStrictEqual(calls, [{
        currentVersion: VERSION,
        existingVersion: VERSION
    }]);
});

test("incompatible Policy result skips hash comparison", () => {
    const { result } = resolve(createChangeContext({
        currentContentHash: "not-a-hash"
    }), {
        evaluate: () => ({ status: "incompatible" })
    });

    assert.deepStrictEqual(result, { status: "incompatible", recordId: "record-1" });
});

test("new, pending, conflict, invalid, and unknown identity do not call Policy", () => {
    for (const status of [
        "new_candidate",
        "pending_review",
        "conflict",
        "invalid",
        "unknown"
    ]) {
        const { result, calls } = resolve(createChangeContext({
            identityResolution: { status, recordId: "record-1" }
        }));

        assert.deepStrictEqual(result, { status: "identity_not_resolved" }, status);
        assert.deepStrictEqual(calls, [], status);
    }
});

test("missing or invalid identity input fails safely", () => {
    for (const context of [
        null,
        [],
        {},
        createChangeContext({ identityResolution: undefined }),
        createChangeContext({ identityResolution: { status: "resolved" } }),
        createChangeContext({ identityResolution: { status: "resolved", recordId: " " } })
    ]) {
        const { result } = resolve(context);
        assert.strictEqual(result.status, "invalid");
    }
});

test("missing existing state and mismatched record IDs do not compare hashes", () => {
    const missingState = resolve(createChangeContext({
        existingRecordState: undefined
    })).result;
    const mismatch = resolve(createChangeContext({
        currentContentHash: EXISTING_HASH,
        existingRecordState: {
            recordId: "record-2",
            contentHash: CURRENT_HASH,
            canonicalizationVersion: VERSION
        }
    })).result;

    assert.strictEqual(missingState.status, "invalid");
    assert.deepStrictEqual(mismatch, { status: "conflict" });
});

test("missing and malformed hashes are never candidates", () => {
    for (const context of [
        createChangeContext({ currentContentHash: undefined }),
        createChangeContext({ currentContentHash: "A".repeat(64) }),
        createChangeContext({
            existingRecordState: {
                recordId: "record-1",
                contentHash: "not-a-hash",
                canonicalizationVersion: VERSION
            }
        })
    ]) {
        const { result } = resolve(context);
        assert.deepStrictEqual(result, {
            status: "invalid",
            errorCode: "record_change_hash_invalid"
        });
    }
});

test("Policy throw and malformed result fail safely", () => {
    const thrown = resolve(undefined, {
        evaluate() {
            throw new Error("internal policy detail");
        }
    }).result;
    const malformed = resolve(undefined, { evaluate: () => ({}) }).result;

    assert.deepStrictEqual(thrown, {
        status: "invalid",
        errorCode: "canonicalization_compatibility_unavailable"
    });
    assert.deepStrictEqual(malformed, {
        status: "invalid",
        errorCode: "canonicalization_compatibility_invalid"
    });
});

test("input is not mutated and output contains no unrelated input fields", () => {
    const context = createChangeContext({
        facilityId: "facility-1",
        residentId: "resident-1",
        versionId: "version-1",
        credential: "credential"
    });
    const before = JSON.stringify(context);
    const { result } = resolve(context);

    assert.strictEqual(JSON.stringify(context), before);
    assert.deepStrictEqual(result, {
        status: "unchanged_candidate",
        recordId: "record-1"
    });
});
test("updated candidate preserves trusted existing content hash for persistence CAS", () => {
    const existingContentHash =
        "a".repeat(64);

    const currentContentHash =
        "b".repeat(64);

    const resolver =
        new RecordChangeResolver({
            canonicalizationCompatibilityPolicy: {
                evaluate() {
                    return {
                        status: "compatible"
                    };
                }
            }
        });

    const result =
        resolver.resolve({
            identityResolution: {
                status: "resolved",
                recordId: "record-1"
            },
            existingRecordState: {
                recordId: "record-1",
                contentHash:
                    existingContentHash,
                canonicalizationVersion:
                    "risen-semantic-canonicalization-1"
            },
            currentContentHash,
            currentCanonicalizationVersion:
                "risen-semantic-canonicalization-1"
        });

    assert.deepStrictEqual(
        result,
        {
            status: "updated_candidate",
            recordId: "record-1",
            expectedContentHash:
                existingContentHash
        }
    );
});
