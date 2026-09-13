"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationHttpAdapter =
    require("./SourceFieldInterpretationHttpAdapter");

test("returns 200 for created interpretation", async () => {
    const adapter =
        new SourceFieldInterpretationHttpAdapter({
            ingestionService: {
                async ingest(input) {
                    assert.equal(
                        input.sourceFieldInterpretation.sourceFieldKey,
                        "sheet:0:column:2"
                    );

                    return {
                        status: "created"
                    };
                }
            }
        });

    const result =
        await adapter.handle({
            requestId: "request-1",
            connectorId: "connector-1",
            credential: "credential",
            sourceFieldInterpretation: {
                sourceDocumentKey:
                    "source-document-1",
                sourceFieldKey:
                    "sheet:0:column:2",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            }
        });

    assert.deepEqual(
        result,
        {
            statusCode: 200,
            body: {
                status: "created"
            }
        }
    );
});

test("returns 401 for denied interpretation", async () => {
    const adapter =
        new SourceFieldInterpretationHttpAdapter({
            ingestionService: {
                async ingest() {
                    return {
                        status: "denied"
                    };
                }
            }
        });

    const result =
        await adapter.handle({
            requestId: "request-2"
        });

    assert.equal(
        result.statusCode,
        401
    );

    assert.equal(
        result.body.errorCode,
        "connector_trust_denied"
    );
});

test("returns 422 for invalid interpretation", async () => {
    const adapter =
        new SourceFieldInterpretationHttpAdapter({
            ingestionService: {
                async ingest() {
                    return {
                        status: "invalid"
                    };
                }
            }
        });

    const result =
        await adapter.handle({
            requestId: "request-3"
        });

    assert.equal(
        result.statusCode,
        422
    );

    assert.equal(
        result.body.errorCode,
        "source_field_interpretation_invalid"
    );
});
