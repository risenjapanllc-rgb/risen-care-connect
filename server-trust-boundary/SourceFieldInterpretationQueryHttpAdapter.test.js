"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationQueryHttpAdapter =
    require("./SourceFieldInterpretationQueryHttpAdapter");

test("returns found interpretations", async () => {
    const adapter =
        new SourceFieldInterpretationQueryHttpAdapter({
            queryService: {
                async list() {
                    return {
                        status: "found",
                        interpretations: [
                            {
                                sourceFieldKey:
                                    "sheet:0:column:1",
                                interpretationStatus:
                                    "deferred",
                                mappingStatus:
                                    "unmapped",
                                confirmedMeaning:
                                    null,
                                confirmedByHuman:
                                    true
                            }
                        ]
                    };
                }
            }
        });

    const result =
        await adapter.handle({
            requestId:
                "request-1",
            connectorId:
                "connector-1",
            credential:
                "credential-1",
            sourceDocumentKey:
                "source-document-1"
        });

    assert.equal(
        result.statusCode,
        200
    );

    assert.equal(
        result.body.status,
        "found"
    );

    assert.equal(
        result.body.interpretations.length,
        1
    );
});

test("maps invalid query to 422", async () => {
    const adapter =
        new SourceFieldInterpretationQueryHttpAdapter({
            queryService: {
                async list() {
                    return {
                        status: "invalid"
                    };
                }
            }
        });

    const result =
        await adapter.handle({
            requestId:
                "request-1"
        });

    assert.equal(
        result.statusCode,
        422
    );

    assert.equal(
        result.body.errorCode,
        "source_field_interpretation_query_invalid"
    );
});
