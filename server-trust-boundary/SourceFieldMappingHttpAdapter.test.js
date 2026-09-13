"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldMappingHttpAdapter =
    require("./SourceFieldMappingHttpAdapter");

function createAdapter(result) {
    const ingestionService = {
        async ingest(input) {
            createAdapter.lastInput = input;
            return result;
        }
    };

    return new SourceFieldMappingHttpAdapter({
        ingestionService
    });
}

test("requires ingestionService", () => {
    assert.throws(
        () =>
            new SourceFieldMappingHttpAdapter(),
        /requires ingestionService/
    );
});

test("maps created updated and unchanged to 200", async () => {
    for (
        const status
        of [
            "created",
            "updated",
            "unchanged"
        ]
    ) {
        const adapter =
            createAdapter({
                status
            });

        const result =
            await adapter.handle({
                connectorId:
                    "connector-id",
                credential:
                    "credential",
                sourceFieldMapping: {
                    sourceFieldMappingKey:
                        "source-document-key"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                statusCode: 200,
                body: {
                    status
                }
            }
        );
    }
});

test("maps denied to 401 without exposing internals", async () => {
    const adapter =
        createAdapter({
            status: "denied",
            errorCode:
                "connector_trust_denied"
        });

    const result =
        await adapter.handle({
            requestId:
                "request-denied",
            connectorId:
                "connector-id",
            credential:
                "credential",
            sourceFieldMapping: {}
        });

    assert.deepStrictEqual(
        result,
        {
            statusCode: 401,
            body: {
                requestId:
                    "request-denied",
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            }
        }
    );
});

test("maps invalid to 422", async () => {
    const adapter =
        createAdapter({
            status: "invalid",
            errorCode:
                "source_field_mapping_invalid"
        });

    const result =
        await adapter.handle({
            requestId:
                "request-invalid",
            connectorId:
                "connector-id",
            credential:
                "credential",
            sourceFieldMapping: {}
        });

    assert.deepStrictEqual(
        result,
        {
            statusCode: 422,
            body: {
                requestId:
                    "request-invalid",
                status: "invalid",
                errorCode:
                    "source_field_mapping_invalid"
            }
        }
    );
});

test("maps service errors to 503 without exposing details", async () => {
    const adapter =
        createAdapter({
            status: "error",
            errorCode:
                "source_field_mapping_persistence_unavailable"
        });

    const result =
        await adapter.handle({
            requestId:
                "request-id",
            connectorId:
                "connector-id",
            credential:
                "credential",
            sourceFieldMapping: {}
        });

    assert.deepStrictEqual(
        result,
        {
            statusCode: 503,
            body: {
                requestId:
                    "request-id",
                status: "error",
                errorCode:
                    "connector_processing_unavailable"
            }
        }
    );
});

test("passes connector credentials and source field mapping to service", async () => {
    const adapter =
        createAdapter({
            status: "created"
        });

    const sourceFieldMapping = {
        sourceFieldMappingKey:
            "source-document-key"
    };

    await adapter.handle({
        connectorId:
            "connector-id",
        credential:
            "credential",
        sourceFieldMapping
    });

    assert.deepStrictEqual(
        createAdapter.lastInput,
        {
            connectorId:
                "connector-id",
            credential:
                "credential",
            sourceFieldMapping
        }
    );
});

test("maps service errors to safe connector error and logs internal diagnostic", async () => {
    const diagnostics = [];

    const ingestionService = {
        async ingest() {
            return {
                status: "error",
                errorCode:
                    "source_field_mapping_persistence_unavailable"
            };
        }
    };

    const adapter =
        new SourceFieldMappingHttpAdapter({
            ingestionService,
            diagnosticLogger: {
                error(entry) {
                    diagnostics.push(entry);
                }
            }
        });

    const result =
        await adapter.handle({
            requestId:
                "request-safe-id",
            connectorId:
                "connector-id",
            credential:
                "secret-credential",
            sourceFieldMapping: {}
        });

    assert.deepStrictEqual(
        result,
        {
            statusCode: 503,
            body: {
                requestId:
                    "request-safe-id",
                status: "error",
                errorCode:
                    "connector_processing_unavailable"
            }
        }
    );

    assert.deepStrictEqual(
        diagnostics,
        [
            {
                requestId:
                    "request-safe-id",
                status: "error",
                internalErrorCode:
                    "source_field_mapping_persistence_unavailable"
            }
        ]
    );

    assert.equal(
        JSON.stringify(diagnostics)
            .includes("secret-credential"),
        false
    );
});
