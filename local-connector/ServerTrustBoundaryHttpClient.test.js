"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ServerTrustBoundaryHttpClient =
    require("./ServerTrustBoundaryHttpClient");

test("requires endpoint", () => {
    assert.throws(
        () =>
            new ServerTrustBoundaryHttpClient({
                connectorId: "connector-id",
                credential: "credential",
                authorizationScheme:
                    "RISEN-Connector"
            }),
        /requires endpoint/
    );
});

test("requires connectorId", () => {
    assert.throws(
        () =>
            new ServerTrustBoundaryHttpClient({
                endpoint:
                    "https://backend.example/connector/ingest",
                credential: "credential",
                authorizationScheme:
                    "RISEN-Connector"
            }),
        /requires connectorId/
    );
});

test("requires credential", () => {
    assert.throws(
        () =>
            new ServerTrustBoundaryHttpClient({
                endpoint:
                    "https://backend.example/connector/ingest",
                connectorId:
                    "connector-id",
                authorizationScheme:
                    "RISEN-Connector"
            }),
        /requires credential/
    );
});

test("sends only trusted transport headers and payload", async () => {
    const calls = [];

    const client =
        new ServerTrustBoundaryHttpClient({
            endpoint:
                "https://backend.example/connector/ingest",
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
                                requestId:
                                    "request-123",
                                status:
                                    "unmatched"
                            };
                        }
                    };
                }
        });

    const payload = {
        sourceResident: {
            identifier: {
                value: "RES-123"
            }
        },
        source: {
            fileName:
                "record.docx",
            updatedAt:
                "2026-09-09T10:00:00Z"
        },
        documentType:
            "support_record",
        sourceType:
            "word"
    };

    const result =
        await client.ingest(payload);

    assert.deepStrictEqual(
        result,
        {
            requestId:
                "request-123",
            status:
                "unmatched"
        }
    );

    assert.strictEqual(
        calls.length,
        1
    );

    assert.strictEqual(
        calls[0].url,
        "https://backend.example/connector/ingest"
    );

    assert.strictEqual(
        calls[0].options.method,
        "POST"
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
        JSON.stringify(payload)
    );
});

test("does not put credential or connectorId into JSON body", async () => {
    let sentBody;

    const client =
        new ServerTrustBoundaryHttpClient({
            endpoint:
                "https://backend.example/connector/ingest",
            connectorId:
                "connector-id-secret",
            credential:
                "credential-secret",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
                async (url, options) => {
                    sentBody =
                        options.body;

                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                requestId:
                                    "request-456",
                                status:
                                    "unmatched"
                            };
                        }
                    };
                }
        });

    await client.ingest({
        sourceResident: {
            identifier: {
                value: "RES-123"
            }
        }
    });

    assert.strictEqual(
        sentBody.includes(
            "connector-id-secret"
        ),
        false
    );

    assert.strictEqual(
        sentBody.includes(
            "credential-secret"
        ),
        false
    );
});

test("times out stalled requests", async () => {
    const client =
        new ServerTrustBoundaryHttpClient({
            endpoint:
                "https://backend.example/connector/ingest",
            connectorId:
                "connector-id",
            credential:
                "credential-value",
            authorizationScheme:
                "RISEN-Connector",
            timeoutMs: 20,
            fetchImpl:
                async (url, options) =>
                    await new Promise(
                        (resolve, reject) => {
                            if (!options.signal) {
                                reject(
                                    new Error(
                                        "missing request timeout signal"
                                    )
                                );
                                return;
                            }

                            if (options.signal.aborted) {
                                reject(
                                    new Error(
                                        "request timed out"
                                    )
                                );
                                return;
                            }

                            options.signal.addEventListener(
                                "abort",
                                () => {
                                    reject(
                                        new Error(
                                            "request timed out"
                                        )
                                    );
                                },
                                {
                                    once: true
                                }
                            );
                        }
                    )
        });

    await assert.rejects(
        () =>
            client.ingest({
                sourceResident: {
                    identifier: {
                        value:
                            "RES-123"
                    }
                }
            }),
        /request timed out/
    );
});

test("rejects non-2xx responses", async () => {
    const client =
        new ServerTrustBoundaryHttpClient({
            endpoint:
                "https://backend.example/connector/ingest",
            connectorId:
                "connector-id",
            credential:
                "credential-value",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
                async () => ({
                    ok: false,
                    status: 503,
                    async json() {
                        return {
                            status:
                                "error",
                            errorCode:
                                "connector_processing_unavailable"
                        };
                    }
                })
        });

    await assert.rejects(
        () =>
            client.ingest({
                sourceResident: {
                    identifier: {
                        value:
                            "RES-123"
                    }
                }
            }),
        /Server Trust Boundary request failed/
    );
});

test("rejects malformed JSON responses", async () => {
    const client =
        new ServerTrustBoundaryHttpClient({
            endpoint:
                "https://backend.example/connector/ingest",
            connectorId:
                "connector-id",
            credential:
                "credential-value",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
                async () => ({
                    ok: true,
                    status: 200,
                    async json() {
                        throw new SyntaxError(
                            "Unexpected token"
                        );
                    }
                })
        });

    await assert.rejects(
        () =>
            client.ingest({
                sourceResident: {
                    identifier: {
                        value:
                            "RES-123"
                    }
                }
            }),
        /Server Trust Boundary returned invalid JSON/
    );
});

test("rejects non-local HTTP endpoint", () => {
    assert.throws(
        () =>
            new ServerTrustBoundaryHttpClient({
                endpoint:
                    "http://backend.example/connector/ingest",
                connectorId:
                    "connector-id",
                credential:
                    "credential-value",
                authorizationScheme:
                    "RISEN-Connector"
            }),
        /HTTPS endpoint/
    );
});

test("allows HTTP endpoint for localhost", () => {
    assert.doesNotThrow(
        () =>
            new ServerTrustBoundaryHttpClient({
                endpoint:
                    "http://127.0.0.1:8787/connector/ingest",
                connectorId:
                    "connector-id",
                credential:
                    "credential-value",
                authorizationScheme:
                    "RISEN-Connector"
            })
    );
});

test(
    "rejects malformed successful response shape",
    async () => {
        const client =
            new ServerTrustBoundaryHttpClient({
                endpoint:
                    "https://backend.example/connector/ingest",
                connectorId:
                    "connector-test",
                credential:
                    "credential-test",
                authorizationScheme:
                    "RISEN-Connector",
                fetchImpl:
                    async () => ({
                        ok: true,
                        json:
                            async () => ({
                                unexpected:
                                    "value"
                            })
                    })
            });

        await assert.rejects(
            () =>
                client.ingest({
                    sourceResident: {
                        identifier: {
                            value:
                                "RES-123"
                        }
                    },
                    source: {
                        fileName:
                            "document.xlsx",
                        updatedAt:
                            "2026-09-09T12:00:00Z"
                    },
                    documentType:
                        "support_record",
                    sourceType:
                        "excel"
                }),
            /invalid response/
        );
    }
);
