"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createServerTrustBoundaryHttpRuntime
} = require("./httpRuntime");

test("creates complete Server Trust Boundary HTTP runtime", () => {
    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb",
            sourceDocumentJsonBodyLimit:
                "25mb"
        });

    assert.ok(runtime);
    assert.ok(runtime.app);

    assert.deepStrictEqual(
        Object.keys(runtime),
        ["app"]
    );
});

test("requires explicit HTTP transport configuration", () => {
    assert.throws(
        () => createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password"
        }),
        /requires authorizationScheme/
    );
});

test("accepts diagnostic logger without exposing it from runtime", () => {
    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "publishable-key",
            connectorTrustEmail:
                "trust@example.local",
            connectorTrustPassword:
                "password",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb",
            sourceDocumentJsonBodyLimit:
                "25mb",
            diagnosticLogger: {
                error() {}
            }
        });

    assert.deepStrictEqual(
        Object.keys(runtime),
        ["app"]
    );

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            runtime,
            "diagnosticLogger"
        ),
        false
    );
});


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

        await fn(
            `http://127.0.0.1:${address.port}`
        );
    } finally {
        await new Promise((resolve) => {
            server.close(resolve);
        });
    }
}

test("mounts source-document endpoint in HTTP runtime", async () => {
    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb",
            sourceDocumentJsonBodyLimit:
                "25mb"
        });

    await withServer(
        runtime.app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/source-documents`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
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
                                        rows: []
                                    },
                                    sourceUpdatedAt:
                                        null,
                                    sourceSize:
                                        0,
                                    observedAt:
                                        "2026-09-11T10:01:00.000Z"
                                }
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                401
            );

            const body =
                await response.json();

            assert.strictEqual(
                body.errorCode,
                "connector_trust_denied"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});


test("mounts source-field-mapping endpoint in HTTP runtime", async () => {
    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb",
            sourceDocumentJsonBodyLimit:
                "25mb"
        });

    await withServer(
        runtime.app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/source-field-mappings`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sourceFieldMapping: {
                                    sourceDocumentKey:
                                        "source-document-key",
                                    sourceFieldKey:
                                        "sheet:0:column:3",
                                    standardEntityName:
                                        "user",
                                    standardFieldName:
                                        "blood_type",
                                    sheetName:
                                        "Sheet1",
                                    headerLabel:
                                        "血液型"
                                }
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                401
            );

            const body =
                await response.json();

            assert.strictEqual(
                body.errorCode,
                "connector_trust_denied"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});


test("mounts voice-call endpoint in HTTP runtime", async () => {
    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb",
            sourceDocumentJsonBodyLimit:
                "25mb"
        });

    await withServer(
        runtime.app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/voice-calls`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                to:
                                    "09012345678"
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                401
            );

            const body =
                await response.json();

            assert.strictEqual(
                body.errorCode,
                "connector_trust_denied"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});


test(
    "voice-call HTTP runtime rejects client-supplied facilityId",
    async () => {
        const runtime =
            createServerTrustBoundaryHttpRuntime({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey:
                    "test-publishable-key",
                connectorTrustEmail:
                    "connector@example.local",
                connectorTrustPassword:
                    "test-password",
                authorizationScheme:
                    "RISEN-Connector",
                connectorIdHeader:
                    "x-risen-connector-id",
                endpointPath:
                    "/connector/ingest",
                jsonBodyLimit:
                    "100kb",
                sourceDocumentJsonBodyLimit:
                    "25mb"
            });

        await withServer(
            runtime.app,
            async (baseUrl) => {
                const response =
                    await fetch(
                        `${baseUrl}/connector/voice-calls`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "X-RISEN-Connector-Id":
                                    "connector-A",

                                "Authorization":
                                    "RISEN-Connector test-credential"
                            },

                            body:
                                JSON.stringify({
                                    facilityId:
                                        "facility-ATTACKER",

                                    to:
                                        "09012345678"
                                })
                        }
                    );

                assert.strictEqual(
                    response.status,
                    400
                );

                const body =
                    await response.json();

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
    }
);
