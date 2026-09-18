"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldMappingQueryHttpAdapter =
    require("./SourceFieldMappingQueryHttpAdapter");

test("returns found mappings", async () => {
    const adapter =
        new SourceFieldMappingQueryHttpAdapter({
            queryService: {
                async list() {
                    return {
                        status: "found",
                        mappings: [
                            {
                                sourceFieldKey:
                                    "sheet:0:column:2",
                                standardEntityName:
                                    "user",
                                standardFieldName:
                                    "user_code",
                                confirmedAt:
                                    "2026-09-15T01:00:00.000Z"
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
        result.body.mappings.length,
        1
    );
});

test("maps invalid mapping query to 422", async () => {
    const adapter =
        new SourceFieldMappingQueryHttpAdapter({
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
        "source_field_mapping_query_invalid"
    );
});
