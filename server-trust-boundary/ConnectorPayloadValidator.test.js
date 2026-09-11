const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorPayloadValidator = require("./ConnectorPayloadValidator");

test("valid minimal payload => valid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.deepStrictEqual(result.validatedPayload, {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    });
});

test("optional name accepted", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: { value: "田中太郎" }
        },
        source: {
            fileName: "document.xlsx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "assessment",
        sourceType: "excel"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.deepStrictEqual(result.validatedPayload.sourceResident, {
        identifier: { value: "RES-123" },
        name: { value: "田中太郎" }
    });
});

test("missing payload => invalid", () => {
    const validator = new ConnectorPayloadValidator();

    const result = validator.validate(null);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "payload_missing");
});

test("undefined payload => invalid", () => {
    const validator = new ConnectorPayloadValidator();

    const result = validator.validate(undefined);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "payload_missing");
});

test("missing sourceResident => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_missing");
});

test("missing identifier => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {},
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_identifier_invalid");
});

test("non-string identifier => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: 12345 }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_identifier_invalid");
});

test("blank identifier => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_identifier_invalid");
});

test("whitespace-only identifier => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "   " }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_identifier_invalid");
});

test("overlong identifier => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const longId = "x".repeat(129);
    const payload = {
        sourceResident: {
            identifier: { value: longId }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_identifier_invalid");
});

test("name with non-string value => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: { value: 12345 }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_name_invalid");
});

test("name with overlong value => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const longName = "x".repeat(201);
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: { value: longName }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_name_invalid");
});

test("name with null value => treated as absent", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: { value: null }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.sourceResident.name, undefined);
});

test("name with empty string => treated as absent", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: { value: "" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.sourceResident.name, undefined);
});

test("name as null (not object) => treated as absent", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: null
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.sourceResident.name, undefined);
});

test("missing source => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_missing");
});

test("filename with forward slash => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "path/to/document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_filename_invalid");
});

test("filename with backslash => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "path\\to\\document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_filename_invalid");
});

test("blank filename => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_filename_invalid");
});

test("overlong filename => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const longFileName = "x".repeat(256);
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: longFileName,
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_filename_invalid");
});

test("invalid updatedAt format => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-13-45"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_updated_at_invalid");
});

test("invalid updatedAt type => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: 1234567890
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_updated_at_invalid");
});

test("unsupported documentType => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "unsupported_type",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "document_type_invalid");
});

test("unsupported sourceType => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "pdf"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_type_invalid");
});

test("unknown fields are not returned", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            unknownField: "should-be-dropped"
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z",
            unknownSourceField: "should-be-dropped"
        },
        documentType: "support_record",
        sourceType: "word",
        unknownTopLevel: "should-be-dropped"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.unknownTopLevel, undefined);
    assert.strictEqual(result.validatedPayload.sourceResident.unknownField, undefined);
    assert.strictEqual(result.validatedPayload.source.unknownSourceField, undefined);
});

test("client facilityId is not returned", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        facilityId: "client-facility-123",
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.facilityId, undefined);
});

test("client residentId is not returned", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        residentId: "client-resident-123",
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.residentId, undefined);
});

test("credential is not returned", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        credential: "secret-token-xyz",
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.credential, undefined);
});

test("token is not returned", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        token: "bearer-xyz",
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.token, undefined);
});

test("password is not returned", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        password: "secret-pass",
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.password, undefined);
});

test("secret is not returned", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        secret: "secret-value",
        sourceResident: {
            identifier: { value: "RES-123" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.secret, undefined);
});

test("returned object contains only allowlisted structure", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: { value: "太郎" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    };

    const result = validator.validate(payload);

    assert.strictEqual(result.status, "valid");
    const validatedPayload = result.validatedPayload;
    const allowedKeys = new Set(["sourceResident", "source", "documentType", "sourceType"]);
    const actualKeys = new Set(Object.keys(validatedPayload));

    assert.deepStrictEqual(actualKeys, allowedKeys);

    const sourceResidentKeys = new Set(Object.keys(validatedPayload.sourceResident));
    const allowedSourceResidentKeys = new Set(["identifier", "name"]);
    assert.deepStrictEqual(sourceResidentKeys, allowedSourceResidentKeys);

    const sourceKeys = new Set(Object.keys(validatedPayload.source));
    const allowedSourceKeys = new Set(["fileName", "updatedAt"]);
    assert.deepStrictEqual(sourceKeys, allowedSourceKeys);
});

test("input object is not mutated", () => {
    const validator = new ConnectorPayloadValidator();
    const payload = {
        sourceResident: {
            identifier: { value: "RES-123" },
            name: { value: "太郎" }
        },
        source: {
            fileName: "document.docx",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word",
        unknownField: "should-stay"
    };

    const payloadCopy = JSON.parse(JSON.stringify(payload));

    validator.validate(payload);

    assert.deepStrictEqual(payload, payloadCopy);
});

test("all allowed documentTypes accepted", () => {
    const validator = new ConnectorPayloadValidator();
    const allowedTypes = ["support_record", "individual_support_plan", "assessment", "monitoring", "other"];

    for (const docType of allowedTypes) {
        const payload = {
            sourceResident: {
                identifier: { value: "RES-123" }
            },
            source: {
                fileName: "document.docx",
                updatedAt: "2026-09-05T10:00:00Z"
            },
            documentType: docType,
            sourceType: "word"
        };

        const result = validator.validate(payload);
        assert.strictEqual(result.status, "valid", `documentType ${docType} should be valid`);
        assert.strictEqual(result.validatedPayload.documentType, docType);
    }
});

test("all allowed sourceTypes accepted", () => {
    const validator = new ConnectorPayloadValidator();
    const allowedTypes = ["word", "excel"];

    for (const srcType of allowedTypes) {
        const payload = {
            sourceResident: {
                identifier: { value: "RES-123" }
            },
            source: {
                fileName: "document.docx",
                updatedAt: "2026-09-05T10:00:00Z"
            },
            documentType: "support_record",
            sourceType: srcType
        };

        const result = validator.validate(payload);
        assert.strictEqual(result.status, "valid", `sourceType ${srcType} should be valid`);
        assert.strictEqual(result.validatedPayload.sourceType, srcType);
    }
});

test("payload as array => invalid / payload_missing", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate([
        {
            sourceResident: { identifier: { value: "RES-123" } },
            source: { fileName: "doc.txt", updatedAt: "2026-09-05T10:00:00Z" },
            documentType: "support_record",
            sourceType: "word"
        }
    ]);
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "payload_missing");
});

test("sourceResident as array => invalid / source_resident_missing", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: [
            { identifier: { value: "RES-123" } }
        ],
        source: { fileName: "doc.txt", updatedAt: "2026-09-05T10:00:00Z" },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_resident_missing");
});

test("source as array => invalid / source_missing", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: [
            { fileName: "doc.txt", updatedAt: "2026-09-05T10:00:00Z" }
        ],
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_missing");
});

test("updatedAt date only => invalid / source_updated_at_invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "2026-09-05"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_updated_at_invalid");
});

test("updatedAt without timezone => invalid / source_updated_at_invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "2026-09-05T10:00:00"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_updated_at_invalid");
});

test("updatedAt space-separated => invalid / source_updated_at_invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "2026-09-05 10:00:00"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_updated_at_invalid");
});

test("updatedAt US date format => invalid / source_updated_at_invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "09/05/2026"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_updated_at_invalid");
});

test("updatedAt text month format => invalid / source_updated_at_invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "September 5, 2026"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "invalid");
    assert.strictEqual(result.errorCode, "source_updated_at_invalid");
});

test("updatedAt ISO 8601 with Z => valid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "2026-09-05T10:00:00Z"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.source.updatedAt, "2026-09-05T10:00:00Z");
});

test("updatedAt ISO 8601 with fractional seconds and Z => valid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "2026-09-05T10:00:00.123Z"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.source.updatedAt, "2026-09-05T10:00:00.123Z");
});

test("updatedAt ISO 8601 with +09:00 timezone => valid", () => {
    const validator = new ConnectorPayloadValidator();
    const result = validator.validate({
        sourceResident: { identifier: { value: "RES-123" } },
        source: {
            fileName: "doc.txt",
            updatedAt: "2026-09-05T10:00:00+09:00"
        },
        documentType: "support_record",
        sourceType: "word"
    });
    assert.strictEqual(result.status, "valid");
    assert.strictEqual(result.validatedPayload.source.updatedAt, "2026-09-05T10:00:00+09:00");
});

test("updatedAt invalid calendar and time boundaries => invalid", () => {
    const validator = new ConnectorPayloadValidator();
    const invalidValues = [
        "2026-02-30T10:00:00Z",
        "2026-13-01T10:00:00Z",
        "2026-00-01T10:00:00Z",
        "2026-09-31T10:00:00Z",
        "2026-09-05T24:01:00Z",
        "2026-09-05T10:60:00Z",
        "2026-09-05T10:00:60Z",
        "2026-09-05T10:00:00+24:00",
        "2026-09-05T10:00:00+09:60"
    ];

    for (const updatedAt of invalidValues) {
        const result = validator.validate({
            sourceResident: { identifier: { value: "RES-123" } },
            source: { fileName: "doc.txt", updatedAt },
            documentType: "support_record",
            sourceType: "word"
        });

        assert.strictEqual(result.status, "invalid", updatedAt);
        assert.strictEqual(result.errorCode, "source_updated_at_invalid", updatedAt);
    }
});

test("updatedAt valid calendar and time boundaries => valid", () => {
    const validator = new ConnectorPayloadValidator();
    const validValues = [
        "2024-02-29T10:00:00Z",
        "2026-09-05T23:59:59Z",
        "2026-09-05T10:00:00-05:00"
    ];

    for (const updatedAt of validValues) {
        const result = validator.validate({
            sourceResident: { identifier: { value: "RES-123" } },
            source: { fileName: "doc.txt", updatedAt },
            documentType: "support_record",
            sourceType: "word"
        });

        assert.strictEqual(result.status, "valid", updatedAt);
        assert.strictEqual(result.validatedPayload.source.updatedAt, updatedAt);
    }
});

test(
    "CSV and MySQL source types are accepted",
    () => {
        const validator =
            new ConnectorPayloadValidator();

        for (const sourceType of [
            "csv",
            "mysql"
        ]) {
            const result =
                validator.validate({
                    sourceResident: {
                        identifier: {
                            value: "RES-123"
                        }
                    },
                    source: {
                        fileName:
                            sourceType === "csv"
                                ? "support.csv"
                                : "query-result",
                        updatedAt:
                            "2026-09-11T00:00:00.000Z"
                    },
                    documentType:
                        "support_record",
                    sourceType
                });

            assert.strictEqual(
                result.status,
                "valid"
            );

            assert.strictEqual(
                result.validatedPayload
                    .sourceType,
                sourceType
            );
        }
    }
);
