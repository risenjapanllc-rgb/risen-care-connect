"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceDocumentPayloadValidator =
    require("./SourceDocumentPayloadValidator");

function validSourceDocument() {
    return {
        sourceDocumentKey:
            "source-document-key",
        sourceType:
            "csv",
        fileName:
            "source.csv",
        sourceContent: {
            rows: [
                ["A", "B"],
                ["1", "2"]
            ]
        },
        sourceUpdatedAt:
            "2026-09-11T10:00:00.000Z",
        sourceSize:
            123,
        observedAt:
            "2026-09-11T10:01:00.000Z"
    };
}

test("accepts structurally valid source document", () => {
    const validator =
        new SourceDocumentPayloadValidator();

    const result =
        validator.validate(
            validSourceDocument()
        );

    assert.deepStrictEqual(
        result,
        {
            status: "valid",
            validatedSourceDocument:
                validSourceDocument()
        }
    );
});

test("accepts null sourceUpdatedAt and sourceSize", () => {
    const validator =
        new SourceDocumentPayloadValidator();

    const sourceDocument = {
        ...validSourceDocument(),
        sourceUpdatedAt: null,
        sourceSize: null
    };

    const result =
        validator.validate(
            sourceDocument
        );

    assert.deepStrictEqual(
        result,
        {
            status: "valid",
            validatedSourceDocument:
                sourceDocument
        }
    );
});

test("rejects missing structural identity", () => {
    const validator =
        new SourceDocumentPayloadValidator();

    for (
        const key
        of [
            "sourceDocumentKey",
            "sourceType",
            "fileName"
        ]
    ) {
        const sourceDocument =
            validSourceDocument();

        sourceDocument[key] = "";

        assert.deepStrictEqual(
            validator.validate(
                sourceDocument
            ),
            {
                status: "invalid",
                errorCode:
                    "source_document_invalid"
            }
        );
    }
});

test("rejects non-object sourceContent", () => {
    const validator =
        new SourceDocumentPayloadValidator();

    const result =
        validator.validate({
            ...validSourceDocument(),
            sourceContent: []
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "source_document_invalid"
        }
    );
});

test("rejects invalid timestamps", () => {
    const validator =
        new SourceDocumentPayloadValidator();

    for (
        const input
        of [
            {
                ...validSourceDocument(),
                sourceUpdatedAt:
                    "not-a-date"
            },
            {
                ...validSourceDocument(),
                observedAt:
                    "not-a-date"
            }
        ]
    ) {
        assert.deepStrictEqual(
            validator.validate(input),
            {
                status: "invalid",
                errorCode:
                    "source_document_invalid"
            }
        );
    }
});

test("rejects negative fractional or non-numeric sourceSize", () => {
    const validator =
        new SourceDocumentPayloadValidator();

    for (
        const sourceSize
        of [
            -1,
            1.5,
            "123"
        ]
    ) {
        assert.deepStrictEqual(
            validator.validate({
                ...validSourceDocument(),
                sourceSize
            }),
            {
                status: "invalid",
                errorCode:
                    "source_document_invalid"
            }
        );
    }
});

test("projects only trusted source-document fields", () => {
    const validator =
        new SourceDocumentPayloadValidator();

    const result =
        validator.validate({
            ...validSourceDocument(),
            facilityId:
                "client-facility",
            connectorId:
                "client-connector",
            residentId:
                "client-resident",
            semanticRecords: [{
                unexpected: true
            }]
        });

    assert.strictEqual(
        result.status,
        "valid"
    );

    assert.deepStrictEqual(
        Object.keys(
            result.validatedSourceDocument
        ).sort(),
        [
            "fileName",
            "observedAt",
            "sourceContent",
            "sourceDocumentKey",
            "sourceSize",
            "sourceType",
            "sourceUpdatedAt"
        ].sort()
    );

    assert.deepStrictEqual(
        result.validatedSourceDocument,
        validSourceDocument()
    );
});
