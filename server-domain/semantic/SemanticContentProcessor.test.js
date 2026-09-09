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
        canonicalizationVersionAuthority: {
            getCurrentVersion() {
                calls.push({ name: "getCurrentVersion", value: [] });
                return "risen-semantic-canonicalization-1";
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
    assert.deepStrictEqual(result.processedSemanticRecord.processingMetadata, {
        canonicalizationVersion: "risen-semantic-canonicalization-1"
    });
});

test("only semanticContent is passed to the canonicalizer", () => {
    const record = createValidatedSemanticRecord();
    const { calls } = process(record);

    assert.deepStrictEqual(calls[1], {
        name: "canonicalize",
        value: record.semanticContent
    });
});

test("only canonicalString is passed to the hasher", () => {
    const { calls } = process();

    assert.deepStrictEqual(calls[2], { name: "hash", value: "canonical-string" });
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

test("dependencies run once in Authority, canonicalize, then hash order", () => {
    const { calls } = process();

    assert.deepStrictEqual(calls.map((call) => call.name), [
        "getCurrentVersion",
        "canonicalize",
        "hash"
    ]);
    assert.deepStrictEqual(calls[0].value, []);
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

test("client supplied versions are not adopted as processing metadata", () => {
    const record = createValidatedSemanticRecord({
        canonicalizationVersion: "evil-version",
        processingMetadata: { canonicalizationVersion: "evil-version" },
        provenance: {
            ...createValidatedSemanticRecord().provenance,
            canonicalizationVersion: "evil-version"
        }
    });
    const { result } = process(record);

    assert.deepStrictEqual(result.processedSemanticRecord.processingMetadata, {
        canonicalizationVersion: "risen-semantic-canonicalization-1"
    });
    assert.strictEqual(
        result.processedSemanticRecord.provenance.canonicalizationVersion,
        "evil-version"
    );
});

test("version remains outside semanticContent and hash input", () => {
    const calls = [];
    const record = createValidatedSemanticRecord();
    const processor = new SemanticContentProcessor({
        canonicalizationVersionAuthority: {
            getCurrentVersion(...args) {
                calls.push({ name: "getCurrentVersion", value: args });
                return "risen-semantic-canonicalization-1";
            }
        },
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
        }
    });
    const result = processor.process(record);

    assert.strictEqual(result.processedSemanticRecord.semanticContent.canonicalizationVersion, undefined);
    assert.deepStrictEqual(calls, [
        { name: "getCurrentVersion", value: [] },
        { name: "canonicalize", value: record.semanticContent },
        { name: "hash", value: "canonical-string" }
    ]);
});

test("Authority failures fail safely before canonicalization", () => {
    for (const authority of [
        { getCurrentVersion() { throw new Error("internal authority detail"); } },
        { getCurrentVersion: () => 123 },
        { getCurrentVersion: () => "" },
        { getCurrentVersion: () => " \n\t " }
    ]) {
        const calls = [];
        const processor = new SemanticContentProcessor({
            canonicalizationVersionAuthority: authority,
            semanticContentCanonicalizer: {
                canonicalize() {
                    calls.push("canonicalize");
                    return { canonicalString: "canonical-string" };
                }
            },
            semanticContentHasher: { hash: () => ({ contentHash: CONTENT_HASH }) }
        });
        const result = processor.process(createValidatedSemanticRecord());

        assert.deepStrictEqual(result, {
            status: "invalid",
            errorCode: "canonicalization_version_unavailable"
        });
        assert.deepStrictEqual(calls, []);
    }
});

test("sourceDocumentKey is preserved through semantic processing", () => {
    const processor =
        new SemanticContentProcessor({
            semanticContentCanonicalizer: {
                canonicalize() {
                    return {
                        canonicalString:
                            '{"semanticType":"support_record","fields":{"supportContent":"支援内容"},"customFields":{}}'
                    };
                }
            },
            semanticContentHasher: {
                hash() {
                    return {
                        contentHash:
                            "a".repeat(64)
                    };
                }
            },
            canonicalizationVersionAuthority: {
                getCurrentVersion() {
                    return "risen-semantic-canonicalization-1";
                }
            }
        });

    const result =
        processor.process({
            sourceRecordContext: {
                sourceResidentIdentifier:
                    "RES-001"
            },
            semanticContent: {
                semanticType:
                    "support_record",
                fields: {
                    supportContent:
                        "支援内容"
                },
                customFields: {}
            },
            provenance: {
                sourceDocumentKey:
                    "opaque-document-key-001",
                documentType:
                    "support_record",
                sourceType:
                    "excel",
                fileName:
                    "support.xlsx"
            }
        });

    assert.strictEqual(
        result.status,
        "processed"
    );

    assert.strictEqual(
        result
            .processedSemanticRecord
            .provenance
            .sourceDocumentKey,
        "opaque-document-key-001"
    );
});
