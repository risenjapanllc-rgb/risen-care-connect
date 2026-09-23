"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationPayloadValidator =
    require("./SourceFieldInterpretationPayloadValidator");

test("validates deferred interpretation", () => {
    const validator =
        new SourceFieldInterpretationPayloadValidator();

    const result =
        validator.validate({
            sourceDocumentKey:
                " source-document-1 ",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
            sourceFieldKey:
                " sheet:0:column:2 ",
            interpretationStatus:
                "deferred",
            mappingStatus:
                "unmapped",
            confirmedMeaning:
                null
        });

    assert.deepEqual(
        result,
        {
            status: "valid",
            validatedSourceFieldInterpretation: {
                sourceDocumentKey:
                    "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
                sourceFieldKey:
                    "sheet:0:column:2",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            }
        }
    );
});

test("validates no-standard-match interpretation", () => {
    const validator =
        new SourceFieldInterpretationPayloadValidator();

    const result =
        validator.validate({
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
            sourceFieldKey:
                "sheet:0:column:3",
            interpretationStatus:
                "confirmed",
            mappingStatus:
                "no_standard_match"
        });

    assert.equal(
        result.status,
        "valid"
    );

    assert.equal(
        result.validatedSourceFieldInterpretation.confirmedMeaning,
        null
    );
});

test("rejects unsupported interpretation status", () => {
    const validator =
        new SourceFieldInterpretationPayloadValidator();

    const result =
        validator.validate({
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
            sourceFieldKey:
                "sheet:0:column:3",
            interpretationStatus:
                "ai_suggested",
            mappingStatus:
                "unmapped"
        });

    assert.deepEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "interpretation_status_invalid"
        }
    );
});

test("rejects unsupported mapping status", () => {
    const validator =
        new SourceFieldInterpretationPayloadValidator();

    const result =
        validator.validate({
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
            sourceFieldKey:
                "sheet:0:column:3",
            interpretationStatus:
                "deferred",
            mappingStatus:
                "suggested"
        });

    assert.deepEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "mapping_status_invalid"
        }
    );
});
