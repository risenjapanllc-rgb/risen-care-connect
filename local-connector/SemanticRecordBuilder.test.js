const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticRecordBuilder = require("./SemanticRecordBuilder");

function createDocument(overrides = {}) {
    return {
        sourceType: "word",
        documentType: "support_record",
        source: {
            fileName: "support.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        content: {
            text: "raw document text"
        },
        extracted: {
            residentId: { value: "legacy-resident-id" },
            sourceResidentIdentifier: { value: "SRC-001", sourceLabel: "利用者ID" },
            sourceResidentName: { value: "山田太郎", sourceLabel: "利用者名" },
            supportContent: { value: "支援内容本文" },
            unknownField: { value: "must not be copied" }
        },
        ...overrides
    };
}

test("valid supportContent => one semantic record", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument());

    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], {
        sourceRecordContext: {
            sourceResidentIdentifier: "SRC-001",
            sourceResidentName: "山田太郎"
        },
        semanticContent: {
            semanticType: "support_record",
            fields: {
                supportContent: "支援内容本文"
            },
            customFields: {}
        },
        provenance: {
            fileName: "support.docx",
            sourceUpdatedAt: "2026-09-05T10:00:00Z",
            documentType: "support_record",
            sourceType: "word"
        }
    });
});

test("supportContent body is preserved exactly", () => {
    const builder = new SemanticRecordBuilder();
    const supportContent = "  支援内容\n次の行  ";
    const result = builder.build(createDocument({
        extracted: {
            ...createDocument().extracted,
            supportContent: { value: supportContent }
        }
    }));

    assert.strictEqual(
        result[0].semanticContent.fields.supportContent,
        supportContent
    );
});

test("sourceResidentIdentifier is outside semanticContent", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument());

    assert.strictEqual(result[0].semanticContent.sourceResidentIdentifier, undefined);
    assert.strictEqual(result[0].sourceRecordContext.sourceResidentIdentifier, "SRC-001");
});

test("sourceResidentName is outside semanticContent", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument());

    assert.strictEqual(result[0].semanticContent.sourceResidentName, undefined);
    assert.strictEqual(result[0].sourceRecordContext.sourceResidentName, "山田太郎");
});

test("legacy residentId is not output", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument());

    assert.strictEqual(result[0].residentId, undefined);
    assert.strictEqual(result[0].sourceRecordContext.residentId, undefined);
});

test("wrong documentType => empty array", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument({ documentType: "assessment" }));

    assert.deepStrictEqual(result, []);
});

test("missing supportContent => empty array", () => {
    const builder = new SemanticRecordBuilder();
    const document = createDocument();
    delete document.extracted.supportContent;

    assert.deepStrictEqual(builder.build(document), []);
});

test("null supportContent => empty array", () => {
    const builder = new SemanticRecordBuilder();
    assert.deepStrictEqual(builder.build(createDocument({
        extracted: { ...createDocument().extracted, supportContent: null }
    })), []);
});

test("empty supportContent => empty array", () => {
    const builder = new SemanticRecordBuilder();
    assert.deepStrictEqual(builder.build(createDocument({
        extracted: { ...createDocument().extracted, supportContent: { value: "" } }
    })), []);
});

test("whitespace-only supportContent => empty array", () => {
    const builder = new SemanticRecordBuilder();
    assert.deepStrictEqual(builder.build(createDocument({
        extracted: { ...createDocument().extracted, supportContent: { value: " \n\t " } }
    })), []);
});

test("raw content is not output", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument());

    assert.strictEqual(result[0].content, undefined);
    assert.strictEqual(result[0].semanticContent.fields.rawText, undefined);
});

test("Excel sheets are not output", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument({
        sourceType: "excel",
        content: {
            sheetNames: ["支援記録"],
            sheets: [{ rows: [["raw"]] }]
        }
    }));

    assert.strictEqual(result[0].content, undefined);
    assert.strictEqual(result[0].sheets, undefined);
});

test("path-like fileName candidates are not output", () => {
    const builder = new SemanticRecordBuilder();
    const pathLikeValues = [
        "C:\\Users\\test\\support.docx",
        "/Users/test/support.docx",
        "C:/Users/test/support.docx",
        "\\\\server\\share\\support.docx",
        "folder/support.docx",
        "folder\\support.docx"
    ];

    for (const fileName of pathLikeValues) {
        const result = builder.build(createDocument({
            source: {
                fileName,
                updatedAt: "2026-09-05T10:00:00Z"
            }
        }));

        assert.strictEqual(result[0].provenance.fileName, undefined, fileName);
        assert.strictEqual(result[0].provenance.absolutePath, undefined, fileName);
    }
});

test("safe basename is output unchanged", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument({
        source: {
            fileName: "support.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        }
    }));

    assert.strictEqual(result[0].provenance.fileName, "support.docx");
});

test("unknown extracted field is not copied", () => {
    const builder = new SemanticRecordBuilder();
    const result = builder.build(createDocument());

    assert.strictEqual(result[0].unknownField, undefined);
    assert.strictEqual(result[0].semanticContent.fields.unknownField, undefined);
});

test("input object is not mutated", () => {
    const builder = new SemanticRecordBuilder();
    const document = createDocument();
    const before = JSON.stringify(document);

    builder.build(document);

    assert.strictEqual(JSON.stringify(document), before);
});
