"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createServerTrustBoundaryApp
} = require("./createServerTrustBoundaryApp");

const ServerTrustBoundaryTransport =
    require("./ServerTrustBoundaryTransport");

const ConnectorCredentialTransport =
    require("./ConnectorCredentialTransport");

async function withServer(app, fn) {
    const server =
        app.listen(0, "127.0.0.1");

    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });

    try {
        const address =
            server.address();

        const baseUrl =
            `http://127.0.0.1:${address.port}`;

        await fn(baseUrl);
    } finally {
        await new Promise((resolve) => {
            server.close(resolve);
        });
    }
}

function createApp({
    adapterResult = {
        requestId: "adapter-request-id",
        status: "unmatched"
    }
} = {}) {
    let received;

    const httpAdapter = {
        async handle(input) {
            received = input;

            return {
                ...adapterResult,
                requestId:
                    input.requestId
            };
        }
    };

    const credentialTransport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    const transport =
        new ServerTrustBoundaryTransport({
            httpAdapter,
            credentialTransport
        });

    return {
        app:
            createServerTrustBoundaryApp({
                transport
            }),
        getReceived:
            () => received
    };
}

test("requires complete transport contract", () => {
    assert.throws(
        () => createServerTrustBoundaryApp({
            transport: {
                async handle() {}
            }
        }),
        /requires transport/
    );
});

test("POST JSON reaches transport and returns HTTP response", async () => {
    const {
        app,
        getReceived
    } = createApp();

    await withServer(
        app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            "X-RISEN-Connector-Id":
                                "connector-id",
                            "Authorization":
                                "RISEN-Connector secret-value"
                        },
                        body:
                            JSON.stringify({
                                payload: {
                                    sourceResident: {
                                        identifier: {
                                            value:
                                                "RES-123"
                                        }
                                    }
                                },
                                semanticRecords: [{
                                    sourceRecordContext: {
                                        sourceRecordKey:
                                            "support_record:primary"
                                    },
                                    semanticContent: {
                                        semanticType:
                                            "support_record",
                                        fields: {
                                            supportContent:
                                                "App transport test"
                                        },
                                        customFields: {}
                                    },
                                    provenance: {
                                        documentType:
                                            "support_record",
                                        sourceDocumentKey:
                                            "app-transport-test-document",
                                        fileName:
                                            "integration-test.docx",
                                        sourceUpdatedAt:
                                            "2026-09-05T10:00:00Z",
                                        sourceType:
                                            "word"
                                    }
                                }]
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                200
            );

            const body =
                await response.json();

            assert.strictEqual(
                body.status,
                "unmatched"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );

            const received =
                getReceived();

            assert.strictEqual(
                received.connectorId,
                "connector-id"
            );

            assert.strictEqual(
                received.credential,
                "secret-value"
            );
        }
    );
});

test("non-POST method is handled by transport as 405", async () => {
    const { app } =
        createApp();

    await withServer(
        app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "GET"
                    }
                );

            assert.strictEqual(
                response.status,
                405
            );

            const body =
                await response.json();

            assert.strictEqual(
                body.errorCode,
                "method_not_allowed"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});

test("malformed JSON returns sanitized 400 with requestId", async () => {
    const { app } =
        createApp();

    await withServer(
        app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            "{\"broken\":"
                    }
                );

            assert.strictEqual(
                response.status,
                400
            );

            const body =
                await response.json();

            assert.deepStrictEqual(
                Object.keys(body).sort(),
                ["errorCode", "requestId"]
            );

            assert.strictEqual(
                body.errorCode,
                "malformed_json"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});

test("unsupported media type returns 415", async () => {
    const { app } =
        createApp();

    await withServer(
        app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "text/plain"
                        },
                        body:
                            "not-json"
                    }
                );

            assert.strictEqual(
                response.status,
                415
            );

            const body =
                await response.json();

            assert.strictEqual(
                body.errorCode,
                "unsupported_media_type"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});

test("does not expose X-Powered-By header", async () => {
    const { app } =
        createApp();

    await withServer(
        app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "GET"
                    }
                );

            assert.strictEqual(
                response.headers.get("x-powered-by"),
                null
            );
        }
    );
});

test("unexpected transport exception returns sanitized 503", async () => {
    const transport = {
        async handle() {
            throw new Error(
                "sensitive internal failure"
            );
        },

        createErrorResponse({
            httpStatus,
            errorCode
        }) {
            return {
                httpStatus,
                body: {
                    requestId:
                        "sanitized-request-id",
                    errorCode
                }
            };
        }
    };

    const app =
        createServerTrustBoundaryApp({
            transport
        });

    await withServer(
        app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "GET"
                    }
                );

            assert.strictEqual(
                response.status,
                503
            );

            const body =
                await response.json();

            assert.deepStrictEqual(
                body,
                {
                    requestId:
                        "sanitized-request-id",
                    errorCode:
                        "connector_processing_unavailable"
                }
            );

            assert.strictEqual(
                JSON.stringify(body).includes(
                    "sensitive internal failure"
                ),
                false
            );
        }
    );
});

test("oversized JSON returns sanitized 413 with requestId", async () => {
    const credentialTransport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    const transport =
        new ServerTrustBoundaryTransport({
            httpAdapter: {
                async handle() {
                    throw new Error(
                        "adapter must not be called"
                    );
                }
            },
            credentialTransport
        });

    const app =
        createServerTrustBoundaryApp({
            transport,
            jsonBodyLimit:
                "100b"
        });

    await withServer(
        app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            "X-RISEN-Connector-Id":
                                "connector-id",
                            "Authorization":
                                "RISEN-Connector secret-value"
                        },
                        body:
                            JSON.stringify({
                                data:
                                    "x".repeat(1000)
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                413
            );

            const body =
                await response.json();

            assert.deepStrictEqual(
                Object.keys(body).sort(),
                ["errorCode", "requestId"]
            );

            assert.strictEqual(
                body.errorCode,
                "payload_too_large"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});

test("mounts source-document transport on separate endpoint without changing semantic endpoint", async () => {
    const semanticTransport = {
        async handle() {
            return {
                httpStatus: 200,
                body: {
                    status: "unmatched"
                }
            };
        },

        createErrorResponse({
            httpStatus,
            errorCode
        }) {
            return {
                httpStatus,
                body: {
                    requestId:
                        "semantic-request-id",
                    errorCode
                }
            };
        }
    };

    let receivedSourceRequest;

    const sourceDocumentTransport = {
        async handle(input) {
            receivedSourceRequest =
                input;

            return {
                httpStatus: 200,
                body: {
                    status: "created"
                }
            };
        },

        createErrorResponse({
            httpStatus,
            errorCode
        }) {
            return {
                httpStatus,
                body: {
                    requestId:
                        "source-request-id",
                    errorCode
                }
            };
        }
    };

    const app =
        createServerTrustBoundaryApp({
            transport:
                semanticTransport,
            endpointPath:
                "/connector/ingest",
            sourceDocumentTransport,
            sourceDocumentEndpointPath:
                "/connector/source-documents"
        });

    await withServer(
        app,
        async (baseUrl) => {
            const semanticResponse =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                payload: {},
                                semanticRecords: [{}]
                            })
                    }
                );

            assert.strictEqual(
                semanticResponse.status,
                200
            );

            const sourceResponse =
                await fetch(
                    `${baseUrl}/connector/source-documents`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            "X-RISEN-Connector-Id":
                                "connector-id",
                            "Authorization":
                                "RISEN-Connector test-credential"
                        },
                        body:
                            JSON.stringify({
                                sourceDocument: {
                                    sourceDocumentKey:
                                        "source-document-key",
                                    sourceType:
                                        "csv",
                                    fileName:
                                        "source.csv",
                                    sourceContent: {
                                        rows: [
                                            ["A", "B"]
                                        ]
                                    },
                                    sourceUpdatedAt:
                                        null,
                                    sourceSize:
                                        10,
                                    observedAt:
                                        "2026-09-11T10:01:00.000Z"
                                }
                            })
                    }
                );

            assert.strictEqual(
                sourceResponse.status,
                200
            );

            assert.deepStrictEqual(
                await sourceResponse.json(),
                {
                    status: "created"
                }
            );

            assert.strictEqual(
                receivedSourceRequest.method,
                "POST"
            );

            assert.strictEqual(
                receivedSourceRequest.contentType,
                "application/json"
            );

            assert.deepStrictEqual(
                receivedSourceRequest.body,
                {
                    sourceDocument: {
                        sourceDocumentKey:
                            "source-document-key",
                        sourceType:
                            "csv",
                        fileName:
                            "source.csv",
                        sourceContent: {
                            rows: [
                                ["A", "B"]
                            ]
                        },
                        sourceUpdatedAt:
                            null,
                        sourceSize:
                            10,
                        observedAt:
                            "2026-09-11T10:01:00.000Z"
                    }
                }
            );
        }
    );
});
