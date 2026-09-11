"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceDocumentHttpClient =
    require("./SourceDocumentHttpClient");

test("sends sourceDocument with connector trust headers only", async () => {
    const calls = [];

    const client =
        new SourceDocumentHttpClient({
            endpoint:
                "https://backend.example/connector/source-documents",
            connectorId:
                "connector-id",
            credential:
                "credential-value",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            fetchImpl:
                async (url, options) => {
                    calls.push({
                        url,
                        options
                    });

                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                status: "created"
                            };
                        }
                    };
                }
        });

    const sourceDocument = {
        sourceDocumentKey:
            "source-document-key",
        sourceType:
            "csv",
        fileName:
            "source.csv",
        sourceContent: {
            sheetNames: ["csv"],
            sheets: []
        },
        sourceUpdatedAt:
            null,
        sourceSize:
            10,
        observedAt:
            "2026-09-11T10:00:00.000Z"
    };

    const result =
        await client.ingest(
            sourceDocument
        );

    assert.deepStrictEqual(
        result,
        {
            status: "created"
        }
    );

    assert.strictEqual(
        calls.length,
        1
    );

    assert.deepStrictEqual(
        calls[0].options.headers,
        {
            "content-type":
                "application/json",
            "x-risen-connector-id":
                "connector-id",
            authorization:
                "RISEN-Connector credential-value"
        }
    );

    assert.strictEqual(
        calls[0].options.body,
        JSON.stringify({
            sourceDocument
        })
    );

    assert.strictEqual(
        calls[0].options.body.includes(
            "credential-value"
        ),
        false
    );

    assert.strictEqual(
        calls[0].options.body.includes(
            "connector-id"
        ),
        false
    );
});

test("accepts created updated and unchanged", async () => {
    for (
        const status
        of [
            "created",
            "updated",
            "unchanged"
        ]
    ) {
        const client =
            new SourceDocumentHttpClient({
                endpoint:
                    "https://backend.example/connector/source-documents",
                connectorId:
                    "connector-id",
                credential:
                    "credential",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                status
                            };
                        }
                    })
            });

        assert.deepStrictEqual(
            await client.ingest({
                sourceDocumentKey:
                    "source-key"
            }),
            {
                status
            }
        );
    }
});

test(
    "preserves only safe Server Trust Boundary error metadata",
    async () => {
        const cases = [
            {
                httpStatus: 401,
                errorCode:
                    "connector_trust_denied",
                requestId:
                    "request-denied"
            },
            {
                httpStatus: 422,
                errorCode:
                    "connector_payload_invalid",
                requestId:
                    "request-invalid"
            },
            {
                httpStatus: 503,
                errorCode:
                    "connector_processing_unavailable",
                requestId:
                    "request-unavailable"
            }
        ];

        for (const item of cases) {
            const client =
                new SourceDocumentHttpClient({
                    endpoint:
                        "https://backend.example/connector/source-documents",
                    connectorId:
                        "connector-id",
                    credential:
                        "secret-credential",
                    authorizationScheme:
                        "RISEN-Connector",
                    fetchImpl:
                        async () => ({
                            ok: false,
                            status:
                                item.httpStatus,
                            async json() {
                                return {
                                    errorCode:
                                        item.errorCode,
                                    requestId:
                                        item.requestId,
                                    credential:
                                        "must-not-propagate",
                                    internalDetail:
                                        "must-not-propagate"
                                };
                            }
                        })
                });

            await assert.rejects(
                () =>
                    client.ingest({
                        sourceDocumentKey:
                            "source-key"
                    }),
                error => {
                    assert.strictEqual(
                        error.code,
                        item.errorCode
                    );

                    assert.strictEqual(
                        error.httpStatus,
                        item.httpStatus
                    );

                    assert.strictEqual(
                        error.requestId,
                        item.requestId
                    );

                    assert.strictEqual(
                        error.credential,
                        undefined
                    );

                    assert.strictEqual(
                        error.internalDetail,
                        undefined
                    );

                    assert.strictEqual(
                        error.message.includes(
                            "secret-credential"
                        ),
                        false
                    );

                    return true;
                }
            );
        }
    }
);


test(
    "classifies network failure with safe error code",
    async () => {
        const client =
            new SourceDocumentHttpClient({
                endpoint:
                    "https://backend.example/connector/source-documents",
                connectorId:
                    "connector-test",
                credential:
                    "secret-test-credential",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () => {
                        throw new Error(
                            "unsafe network detail"
                        );
                    }
            });

        await assert.rejects(
            () =>
                client.ingest({}),
            error => {
                assert.strictEqual(
                    error.code,
                    "server_trust_boundary_unreachable"
                );

                return true;
            }
        );
    }
);

test(
    "classifies invalid success JSON with safe error code",
    async () => {
        const client =
            new SourceDocumentHttpClient({
                endpoint:
                    "https://backend.example/connector/source-documents",
                connectorId:
                    "connector-test",
                credential:
                    "secret-test-credential",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,
                        async json() {
                            throw new Error(
                                "unsafe parser detail"
                            );
                        }
                    })
            });

        await assert.rejects(
            () =>
                client.ingest({}),
            error => {
                assert.strictEqual(
                    error.code,
                    "server_trust_boundary_invalid_response"
                );

                return true;
            }
        );
    }
);

test(
    "classifies invalid success payload with safe error code",
    async () => {
        const client =
            new SourceDocumentHttpClient({
                endpoint:
                    "https://backend.example/connector/source-documents",
                connectorId:
                    "connector-test",
                credential:
                    "secret-test-credential",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () => ({
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                status:
                                    "unexpected"
                            };
                        }
                    })
            });

        await assert.rejects(
            () =>
                client.ingest({}),
            error => {
                assert.strictEqual(
                    error.code,
                    "server_trust_boundary_invalid_response"
                );

                return true;
            }
        );
    }
);
