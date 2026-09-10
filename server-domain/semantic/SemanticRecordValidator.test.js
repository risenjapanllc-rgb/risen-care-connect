const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticRecordValidator = require("./SemanticRecordValidator");

function createRecord(overrides = {}) {
    return {
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
        },
        ...overrides
    };
}

function validResult(overrides = {}) {
    return new SemanticRecordValidator().validate(createRecord(overrides));
}

test("valid support_record => valid", () => {
    const result = validResult();

    assert.strictEqual(result.status, "valid");
    assert.deepStrictEqual(result.validatedSemanticRecord.semanticContent, {
        semanticType: "support_record",
        fields: { supportContent: "支援内容本文" },
        customFields: {}
    });
});

test("supportContent is preserved exactly", () => {
    const supportContent = "  支援内容\n次の行  ";
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent },
            customFields: {}
        }
    });

    assert.strictEqual(
        result.validatedSemanticRecord.semanticContent.fields.supportContent,
        supportContent
    );
});

test("missing semanticContent => invalid", () => {
    const result = validResult({ semanticContent: undefined });
    assert.strictEqual(result.status, "invalid");
});

test("wrong semanticType => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "assessment",
            fields: { supportContent: "本文" },
            customFields: {}
        }
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "semantic_type_invalid");
});

test("missing fields => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            customFields: {}
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("missing supportContent => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: {},
            customFields: {}
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("null supportContent => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: null },
            customFields: {}
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("non-string supportContent => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: 123 },
            customFields: {}
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("empty supportContent => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: "" },
            customFields: {}
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("whitespace-only supportContent => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: " \n\t " },
            customFields: {}
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("non-empty customFields => invalid", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: "本文" },
            customFields: { facilityField: "value" }
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("source resident fields remain outside semanticContent", () => {
    const result = validResult();
    assert.strictEqual(result.validatedSemanticRecord.semanticContent.sourceResidentIdentifier, undefined);
    assert.strictEqual(result.validatedSemanticRecord.semanticContent.sourceResidentName, undefined);
    assert.deepStrictEqual(result.validatedSemanticRecord.sourceRecordContext, {
        sourceResidentIdentifier: "SRC-001",
        sourceResidentName: "山田太郎"
    });
});

test("whitespace-only sourceResidentIdentifier is omitted", () => {
    const result = validResult({
        sourceRecordContext: {
            sourceResidentIdentifier: " \n\t ",
            sourceResidentName: "山田太郎"
        }
    });

    assert.strictEqual(
        result.validatedSemanticRecord.sourceRecordContext.sourceResidentIdentifier,
        undefined
    );
});

test("whitespace-only sourceResidentName is omitted", () => {
    const result = validResult({
        sourceRecordContext: {
            sourceResidentIdentifier: "SRC-001",
            sourceResidentName: " \n\t "
        }
    });

    assert.strictEqual(
        result.validatedSemanticRecord.sourceRecordContext.sourceResidentName,
        undefined
    );
});

test("non-empty resident values preserve their original strings", () => {
    const identifier = "  SRC-001  ";
    const name = "  山田太郎  ";
    const result = validResult({
        sourceRecordContext: {
            sourceResidentIdentifier: identifier,
            sourceResidentName: name
        }
    });

    assert.strictEqual(
        result.validatedSemanticRecord.sourceRecordContext.sourceResidentIdentifier,
        identifier
    );
    assert.strictEqual(
        result.validatedSemanticRecord.sourceRecordContext.sourceResidentName,
        name
    );
});

test("legacy residentId is not returned", () => {
    const result = validResult({
        residentId: "legacy",
        sourceRecordContext: {
            sourceResidentIdentifier: "SRC-001",
            sourceResidentName: "山田太郎",
            residentId: "legacy"
        }
    });
    assert.strictEqual(result.validatedSemanticRecord.residentId, undefined);
    assert.strictEqual(result.validatedSemanticRecord.sourceRecordContext.residentId, undefined);
});

test("facilityId is not returned", () => {
    const result = validResult({ facilityId: "facility-1" });
    assert.strictEqual(result.validatedSemanticRecord.facilityId, undefined);
});

test("credential, token, password, and secret are not returned", () => {
    const result = validResult({
        credential: "credential",
        token: "token",
        password: "password",
        secret: "secret"
    });
    assert.strictEqual(result.validatedSemanticRecord.credential, undefined);
    assert.strictEqual(result.validatedSemanticRecord.token, undefined);
    assert.strictEqual(result.validatedSemanticRecord.password, undefined);
    assert.strictEqual(result.validatedSemanticRecord.secret, undefined);
});

test("raw content is not returned", () => {
    const result = validResult({ content: { text: "raw" } });
    assert.strictEqual(result.validatedSemanticRecord.content, undefined);
    assert.strictEqual(result.validatedSemanticRecord.semanticContent.fields.rawText, undefined);
});

test("sheets are not returned", () => {
    const result = validResult({ sheets: [{ rows: [["raw"]] }] });
    assert.strictEqual(result.validatedSemanticRecord.sheets, undefined);
});

test("unknown top-level field is not returned", () => {
    const result = validResult({ unknownField: "unknown" });
    assert.strictEqual(result.validatedSemanticRecord.unknownField, undefined);
});

test("unknown semanticContent field is not returned", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: "本文" },
            customFields: {},
            unknownField: "unknown"
        }
    });
    assert.strictEqual(result.validatedSemanticRecord.semanticContent.unknownField, undefined);
});

test("unknown fields field is not returned", () => {
    const result = validResult({
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: "本文", unknownField: "unknown" },
            customFields: {}
        }
    });
    assert.strictEqual(result.validatedSemanticRecord.semanticContent.fields.unknownField, undefined);
});

test("unknown provenance field is not returned", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            unknownField: "unknown"
        }
    });
    assert.strictEqual(result.validatedSemanticRecord.provenance.unknownField, undefined);
});

test("path-like fileName => invalid", () => {
    for (const fileName of ["C:\\Users\\test\\support.docx", "/Users/test/support.docx", "folder/support.docx"]) {
        const result = validResult({
            provenance: {
                ...createRecord().provenance,
                fileName
            }
        });
        assert.strictEqual(result.status, "invalid", fileName);
        assert.strictEqual(result.errorCode, "semantic_provenance_filename_invalid", fileName);
    }
});

test("safe basename accepted", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            fileName: "支援記録.xlsx"
        }
    });
    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedSemanticRecord.provenance.fileName, "支援記録.xlsx");
});

test("invalid sourceUpdatedAt => invalid", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            sourceUpdatedAt: "2026-09-05"
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("valid ISO sourceUpdatedAt accepted", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            sourceUpdatedAt: "2026-09-05T10:00:00+09:00"
        }
    });
    assert.strictEqual(result.status, "valid");
});

test("impossible calendar date => invalid", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            sourceUpdatedAt: "2026-02-31T10:00:00Z"
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("invalid time => invalid", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            sourceUpdatedAt: "2026-09-05T24:00:00Z"
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("timezone offset boundary matches existing validator contract", () => {
    const validOffset = validResult({
        provenance: {
            ...createRecord().provenance,
            sourceUpdatedAt: "2026-09-05T10:00:00+23:59"
        }
    });
    const invalidOffset = validResult({
        provenance: {
            ...createRecord().provenance,
            sourceUpdatedAt: "2026-09-05T10:00:00+24:00"
        }
    });

    assert.strictEqual(validOffset.status, "valid");
    assert.strictEqual(invalidOffset.status, "invalid");
});

test("unsupported documentType => invalid", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            documentType: "assessment"
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("unsupported sourceType => invalid", () => {
    const result = validResult({
        provenance: {
            ...createRecord().provenance,
            sourceType: "csv"
        }
    });
    assert.strictEqual(result.status, "invalid");
});

test("input is not mutated", () => {
    const validator = new SemanticRecordValidator();
    const record = createRecord();
    const before = JSON.stringify(record);

    validator.validate(record);

    assert.strictEqual(JSON.stringify(record), before);
});

test("array, null, and primitive inputs => invalid", () => {
    const validator = new SemanticRecordValidator();
    for (const record of [[], null, "record", 123, true]) {
        const result = validator.validate(record);
        assert.strictEqual(result.status, "invalid");
    }
});

test("inherited unknown data does not propagate", () => {
    const inherited = {
        semanticContent: {
            semanticType: "support_record",
            fields: { supportContent: "inherited" },
            customFields: {}
        },
        provenance: createRecord().provenance
    };
    const record = Object.create(inherited);
    const result = new SemanticRecordValidator().validate(record);

    assert.strictEqual(result.status, "invalid");
});

test("inherited nested fields do not propagate", () => {
    const semanticContent = Object.create({
        semanticType: "support_record",
        fields: { supportContent: "inherited" },
        customFields: {}
    });
    const record = createRecord({ semanticContent });
    const result = new SemanticRecordValidator().validate(record);

    assert.strictEqual(result.status, "invalid");
});

test("trusted sourceDocumentKey in provenance is preserved", () => {
    const validator =
        new SemanticRecordValidator();

    const result =
        validator.validate({
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
                    "support.xlsx",
                sourceUpdatedAt:
                    "2026-09-09T10:00:00Z"
            }
        });

    assert.strictEqual(
        result.status,
        "valid"
    );

    assert.strictEqual(
        result
            .validatedSemanticRecord
            .provenance
            .sourceDocumentKey,
        "opaque-document-key-001"
    );
});

test("blank sourceDocumentKey in provenance is invalid", () => {
    const validator =
        new SemanticRecordValidator();

    const result =
        validator.validate({
            sourceRecordContext: {},
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
                    "   ",
                documentType:
                    "support_record",
                sourceType:
                    "excel"
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "semantic_provenance_source_document_key_invalid"
        }
    );
});

test("sourceRecordKey is preserved only inside sourceRecordContext", () => {
    const validator =
        new SemanticRecordValidator();

    const result =
        validator.validate({
            sourceRecordContext: {
                sourceResidentIdentifier:
                    "RES-123",
                sourceRecordKey:
                    "source-record-1"
            },
            semanticContent: {
                semanticType:
                    "support_record",
                fields: {
                    supportContent:
                        "support content"
                },
                customFields: {}
            },
            provenance: {
                sourceDocumentKey:
                    "document-1",
                fileName:
                    "document.docx",
                sourceUpdatedAt:
                    "2026-09-05T10:00:00Z",
                documentType:
                    "support_record",
                sourceType:
                    "word"
            }
        });

    assert.strictEqual(
        result.status,
        "valid"
    );

    assert.strictEqual(
        result
            .validatedSemanticRecord
            .sourceRecordContext
            .sourceRecordKey,
        "source-record-1"
    );

    assert.strictEqual(
        result
            .validatedSemanticRecord
            .semanticContent
            .sourceRecordKey,
        undefined
    );

    assert.strictEqual(
        result
            .validatedSemanticRecord
            .provenance
            .sourceRecordKey,
        undefined
    );
});

test("blank sourceRecordKey is invalid", () => {
    const validator =
        new SemanticRecordValidator();

    for (const sourceRecordKey of [
        "",
        "   "
    ]) {
        const result =
            validator.validate({
                sourceRecordContext: {
                    sourceRecordKey
                },
                semanticContent: {
                    semanticType:
                        "support_record",
                    fields: {
                        supportContent:
                            "support content"
                    },
                    customFields: {}
                },
                provenance: {
                    sourceDocumentKey:
                        "document-1",
                    fileName:
                        "document.docx",
                    sourceUpdatedAt:
                        "2026-09-05T10:00:00Z",
                    documentType:
                        "support_record",
                    sourceType:
                        "word"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "invalid",
                errorCode:
                    "semantic_source_record_context_invalid"
            }
        );
    }
});

test("non-string sourceRecordKey is invalid", () => {
    const validator =
        new SemanticRecordValidator();

    for (const sourceRecordKey of [
        null,
        123,
        {},
        []
    ]) {
        const result =
            validator.validate({
                sourceRecordContext: {
                    sourceRecordKey
                },
                semanticContent: {
                    semanticType:
                        "support_record",
                    fields: {
                        supportContent:
                            "support content"
                    },
                    customFields: {}
                },
                provenance: {
                    sourceDocumentKey:
                        "document-1",
                    fileName:
                        "document.docx",
                    sourceUpdatedAt:
                        "2026-09-05T10:00:00Z",
                    documentType:
                        "support_record",
                    sourceType:
                        "word"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "invalid",
                errorCode:
                    "semantic_source_record_context_invalid"
            }
        );
    }
});
