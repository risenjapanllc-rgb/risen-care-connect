"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const StandardDocumentValidator =
    require("./StandardDocumentValidator");

test("valid standard document passes", () => {
    const validator =
        new StandardDocumentValidator();

    assert.deepStrictEqual(
        validator.validate({
            sourceType: "excel",
            documentType:
                "support_record"
        }),
        {
            valid: true,
            issues: []
        }
    );
});

test("missing source type is invalid", () => {
    const validator =
        new StandardDocumentValidator();

    assert.deepStrictEqual(
        validator.validate({
            documentType:
                "support_record"
        }),
        {
            valid: false,
            issues: [
                "source_type_missing"
            ]
        }
    );
});

test("unknown document type is invalid", () => {
    const validator =
        new StandardDocumentValidator();

    assert.deepStrictEqual(
        validator.validate({
            sourceType: "word",
            documentType: "unknown"
        }),
        {
            valid: false,
            issues: [
                "document_type_unresolved"
            ]
        }
    );
});

test("non-object document is invalid", () => {
    const validator =
        new StandardDocumentValidator();

    assert.deepStrictEqual(
        validator.validate(null),
        {
            valid: false,
            issues: [
                "standard_document_unavailable"
            ]
        }
    );
});
