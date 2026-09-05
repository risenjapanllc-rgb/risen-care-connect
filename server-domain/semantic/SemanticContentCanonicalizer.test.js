const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticContentCanonicalizer = require("./SemanticContentCanonicalizer");

function createSemanticContent(overrides = {}) {
    return {
        semanticType: "support_record",
        fields: {
            supportContent: "支援内容本文"
        },
        customFields: {},
        ...overrides
    };
}

function canonicalize(semanticContent = createSemanticContent()) {
    return new SemanticContentCanonicalizer().canonicalize(semanticContent);
}

test("valid support_record canonicalizes", () => {
    const result = canonicalize();

    assert.deepStrictEqual(result.canonicalSemanticContent, {
        semanticType: "support_record",
        fields: { supportContent: "支援内容本文" },
        customFields: {}
    });
    assert.strictEqual(
        result.canonicalString,
        "{\"semanticType\":\"support_record\",\"fields\":{\"supportContent\":\"支援内容本文\"},\"customFields\":{}}"
    );
});

test("key order is deterministic", () => {
    const result = canonicalize();

    assert.deepStrictEqual(Object.keys(result.canonicalSemanticContent), [
        "semanticType",
        "fields",
        "customFields"
    ]);
    assert.deepStrictEqual(Object.keys(result.canonicalSemanticContent.fields), ["supportContent"]);
    assert.deepStrictEqual(Object.keys(result.canonicalSemanticContent.customFields), []);
});

test("different input property order produces the same canonicalString", () => {
    const orderedDifferently = {
        customFields: {},
        fields: { supportContent: "支援内容本文" },
        semanticType: "support_record"
    };

    assert.strictEqual(
        canonicalize(orderedDifferently).canonicalString,
        canonicalize().canonicalString
    );
});

test("supportContent preserves whitespace, newlines, and Japanese text exactly", () => {
    const supportContent = "  支援  内容\n次の行  ";
    const result = canonicalize(createSemanticContent({
        fields: { supportContent }
    }));

    assert.strictEqual(result.canonicalSemanticContent.fields.supportContent, supportContent);
    assert.match(result.canonicalString, /  支援  内容\\n次の行  /);
});

test("half-width and full-width characters are not converted", () => {
    const supportContent = "ABC１２３ ｶﾀｶﾅ カタカナ";
    const result = canonicalize(createSemanticContent({
        fields: { supportContent }
    }));

    assert.strictEqual(result.canonicalSemanticContent.fields.supportContent, supportContent);
});

test("Unicode-equivalent-looking strings are not normalized", () => {
    const composed = canonicalize(createSemanticContent({
        fields: { supportContent: "が" }
    }));
    const decomposed = canonicalize(createSemanticContent({
        fields: { supportContent: "か\u3099" }
    }));

    assert.notStrictEqual(composed.canonicalString, decomposed.canonicalString);
});

test("empty customFields is preserved", () => {
    const result = canonicalize();

    assert.deepStrictEqual(result.canonicalSemanticContent.customFields, {});
});

test("only semanticContent is accepted by the API", () => {
    const record = {
        sourceRecordContext: { sourceResidentIdentifier: "SRC-001" },
        semanticContent: createSemanticContent(),
        provenance: {
            fileName: "support.docx",
            sourceUpdatedAt: "2026-09-05T10:00:00Z"
        },
        residentId: "resident-1",
        facilityId: "facility-1",
        connectorId: "connector-1",
        recordId: "record-1",
        versionId: "version-1",
        requestId: "request-1",
        idempotencyKey: "idempotency-1"
    };
    const result = canonicalize(record.semanticContent);

    for (const value of [
        "sourceRecordContext",
        "provenance",
        "support.docx",
        "2026-09-05T10:00:00Z",
        "resident-1",
        "facility-1",
        "connector-1",
        "record-1",
        "version-1",
        "request-1",
        "idempotency-1"
    ]) {
        assert.doesNotMatch(result.canonicalString, new RegExp(value));
    }
});

test("input is not mutated", () => {
    const semanticContent = createSemanticContent({
        fields: { supportContent: "  本文\n次の行  " }
    });
    const before = JSON.stringify(semanticContent);

    canonicalize(semanticContent);

    assert.strictEqual(JSON.stringify(semanticContent), before);
});

test("canonicalString is deterministic across repeated calls", () => {
    const semanticContent = createSemanticContent();

    assert.strictEqual(
        canonicalize(semanticContent).canonicalString,
        canonicalize(semanticContent).canonicalString
    );
});

test("unsupported semanticType is rejected", () => {
    assert.throws(
        () => canonicalize(createSemanticContent({ semanticType: "assessment" })),
        TypeError
    );
});

test("missing supportContent is rejected", () => {
    assert.throws(
        () => canonicalize(createSemanticContent({ fields: {} })),
        TypeError
    );
});

test("non-string supportContent is rejected", () => {
    assert.throws(
        () => canonicalize(createSemanticContent({
            fields: { supportContent: 123 }
        })),
        TypeError
    );
});

test("unknown semanticContent own field is rejected", () => {
    assert.throws(
        () => canonicalize(createSemanticContent({ unknownField: "x" })),
        TypeError
    );
});

test("unknown fields own field is rejected", () => {
    assert.throws(
        () => canonicalize(createSemanticContent({
            fields: {
                supportContent: "本文",
                unknownField: "x"
            }
        })),
        TypeError
    );
});

test("non-empty customFields is rejected", () => {
    assert.throws(
        () => canonicalize(createSemanticContent({
            customFields: { facilityField: "x" }
        })),
        TypeError
    );
});

test("inherited semanticContent fields are rejected", () => {
    const semanticContent = Object.create(createSemanticContent());

    assert.throws(() => canonicalize(semanticContent), TypeError);
});

test("inherited fields are rejected", () => {
    const fields = Object.create({ supportContent: "本文" });

    assert.throws(
        () => canonicalize(createSemanticContent({ fields })),
        TypeError
    );
});

test("null-prototype semanticContent with allowlisted keys canonicalizes", () => {
    const fields = Object.create(null);
    fields.supportContent = "本文";
    const semanticContent = Object.create(null);
    semanticContent.semanticType = "support_record";
    semanticContent.fields = fields;
    semanticContent.customFields = Object.create(null);

    const result = canonicalize(semanticContent);

    assert.strictEqual(
        result.canonicalString,
        '{"semanticType":"support_record","fields":{"supportContent":"本文"},"customFields":{}}'
    );
});

test("null-prototype semanticContent with unknown own field is rejected", () => {
    const fields = Object.create(null);
    fields.supportContent = "本文";
    const semanticContent = Object.create(null);
    semanticContent.semanticType = "support_record";
    semanticContent.fields = fields;
    semanticContent.customFields = Object.create(null);
    semanticContent.unknownField = "x";

    assert.throws(() => canonicalize(semanticContent), TypeError);
});

test("own special property names are rejected and never canonicalized", () => {
    for (const key of ["__proto__", "constructor", "prototype"]) {
        const semanticContent = createSemanticContent();
        Object.defineProperty(semanticContent, key, {
            value: "x",
            enumerable: true
        });

        assert.throws(() => canonicalize(semanticContent), TypeError, key);
    }
});