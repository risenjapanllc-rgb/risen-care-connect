const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticContentProcessor = require("./SemanticContentProcessor");

const CONTENT_HASH = "a".repeat(64);

function createValidatedSemanticRecord(overrides = {}) {
    return {
        sourceRecordContext: {
            sourceResidentIdentifier: "SRC-001",
            sourceResidentName: "山田太郎"
        },
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: "  支援内容\n次の行  " },
            customFields: {}
        },
        provenance: {
            fileName: "support.docx",
            sourceUpdatedAt: "2026-09-05T10:00:00Z",
            documentType: "support_record",
            sourceType: "word"
        },
        ...overrides
    };
}

function createDependencies(overrides = {}) {
    const calls = [];
    return {
        calls,
        semanticContentCanonicalizer: {
            canonicalize(semanticContent) {
                calls.push({ name: "canonicalize", value: semanticContent });
                return { canonicalString: "canonical-string" };
            }
        },
        semanticContentHasher: {
            hash(canonicalString) {
                calls.push({ name: "hash", value: canonicalString });
                return { contentHash: CONTENT_HASH };
            }
        },
        ...overrides
    };
}

function process(record = createValidatedSemanticRecord(), dependencyOverrides = {}) {
    const dependencies = createDependencies(dependencyOverrides);
    const processor = new SemanticContentProcessor(dependencies);
    return { result: processor.process(record), calls: dependencies.calls };
}

test("valid validatedSemanticRecord => processed", () => {
    const { result } = process();

    assert.strictEqual(result.status, "processed");
    assert.strictEqual(result.processedSemanticRecord.contentHash, CONTENT_HASH);
});

test("only semanticContent is passed to the canonicalizer", () => {
    const record = createValidatedSemanticRecord();
    const { calls } = process(record);

    assert.deepStrictEqual(calls[0], {
        name: "canonicalize",
        value: record.semanticContent
    });
});

test("only canonicalString is passed to the hasher", () => {
    const { calls } = process();

    assert.deepStrictEqual(calls[1], { name: "hash", value: "canonical-string" });
});

test("Hasher contentHash is the only adopted hash", () => {
    const { result } = process(createValidatedSemanticRecord({
        contentHash: "untrusted"
    }));

    assert.strictEqual(result.processedSemanticRecord.contentHash, CONTENT_HASH);
});

test("unknown and identity input fields are not restored", () => {
    const { result } = process(createValidatedSemanticRecord({
        unknownField: "unknown",
        facilityId: "facility-1",
        residentId: "resident-1",
        credential: "credential",
        token: "token",
        password: "password",
        secret: "secret"
    }));
    const processed = result.processedSemanticRecord;

    for (const key of [
        "unknownField",
        "facilityId",
        "residentId",
        "credential",
        "token",
        "password",
        "secret"
    ]) {
        assert.strictEqual(processed[key], undefined, key);
    }
});

test("validated envelope fields and supportContent are preserved", () => {
    const record = createValidatedSemanticRecord();
    const { result } = process(record);
    const processed = result.processedSemanticRecord;

    assert.strictEqual(processed.sourceRecordContext, record.sourceRecordContext);
    assert.strictEqual(processed.provenance, record.provenance);
    assert.strictEqual(processed.semanticContent, record.semanticContent);
    assert.strictEqual(
        processed.semanticContent.fields.supportContent,
        "  支援内容\n次の行  "
    );
    assert.strictEqual(processed.canonicalString, undefined);
});

test("dependencies run once each in canonicalize then hash order", () => {
    const { calls } = process();

    assert.deepStrictEqual(calls.map((call) => call.name), ["canonicalize", "hash"]);
});

test("input is not mutated", () => {
    const record = createValidatedSemanticRecord();
    const before = JSON.stringify(record);

    process(record);

    assert.strictEqual(JSON.stringify(record), before);
});

test("non-plain validated record and missing semanticContent fail safely", () => {
    for (const record of [null, [], "record", createValidatedSemanticRecord({
        semanticContent: undefined
    })]) {
        const { result } = process(record);
        assert.strictEqual(result.status, "invalid");
        assert.strictEqual(result.processedSemanticRecord, undefined);
    }
});

test("canonicalizer and hasher throws fail safely", () => {
    const canonicalizerFailure = process(undefined, {
        semanticContentCanonicalizer: {
            canonicalize() {
                throw new Error("internal canonicalizer detail");
            }
        }
    }).result;
    const hasherFailure = process(undefined, {
        semanticContentHasher: {
            hash() {
                throw new Error("internal hasher detail");
            }
        }
    }).result;

    assert.deepStrictEqual(canonicalizerFailure, {
        status: "invalid",
        errorCode: "semantic_canonicalization_failed"
    });
    assert.deepStrictEqual(hasherFailure, {
        status: "invalid",
        errorCode: "semantic_hashing_failed"
    });
});

test("malformed dependency results fail safely", () => {
    const malformedCanonicalizer = process(undefined, {
        semanticContentCanonicalizer: { canonicalize: () => ({}) }
    }).result;
    const malformedHasher = process(undefined, {
        semanticContentHasher: { hash: () => ({ contentHash: "not-a-hash" }) }
    }).result;

    assert.deepStrictEqual(malformedCanonicalizer, {
        status: "invalid",
        errorCode: "semantic_canonicalizer_result_invalid"
    });
    assert.deepStrictEqual(malformedHasher, {
        status: "invalid",
        errorCode: "semantic_hasher_result_invalid"
    });
});