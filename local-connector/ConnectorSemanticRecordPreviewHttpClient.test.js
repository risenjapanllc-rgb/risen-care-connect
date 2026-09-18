"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Client =
    require("./ConnectorSemanticRecordPreviewHttpClient");

function createClient(fetchImpl) {
    return new Client({
        endpoint:
            "http://127.0.0.1:8787/connector/semantic-record-preview",
        connectorId:
            "connector-1",
        credential:
            "secret",
        authorizationScheme:
            "RISEN-Connector",
        fetchImpl
    });
}

test(
    "lookup sends exact read-only preview request",
    async () => {
        let request = null;

        const client =
            createClient(
                async (url, options) => {
                    request = {
                        url,
                        options
                    };

                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return {
                                status: "found",
                                records: [
                                    {
                                        sourceRecordKey:
                                            "row-1"
                                    }
                                ]
                            };
                        }
                    };
                }
            );

        const result =
            await client.lookup({
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "row-1",
                    "row-2"
                ]
            });

        assert.equal(
            result.status,
            "found"
        );
        assert.equal(
            result.records.length,
            1
        );

        assert.deepEqual(
            JSON.parse(
                request.options.body
            ),
            {
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "row-1",
                    "row-2"
                ]
            }
        );

        assert.equal(
            request.options.method,
            "POST"
        );
    }
);

test(
    "invalid key batches are rejected before fetch",
    async () => {
        let calls = 0;

        const client =
            createClient(
                async () => {
                    calls += 1;
                }
            );

        for (const sourceRecordKeys of [
            [],
            [""],
            ["row-1", "row-1"],
            Array.from(
                { length: 501 },
                (_, index) =>
                    `row-${index}`
            )
        ]) {
            await assert.rejects(
                client.lookup({
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys
                }),
                TypeError
            );
        }

        assert.equal(calls, 0);
    }
);

test(
    "safe server error code is preserved",
    async () => {
        const client =
            createClient(
                async () => ({
                    ok: false,
                    status: 503,
                    async json() {
                        return {
                            errorCode:
                                "connector_processing_unavailable"
                        };
                    }
                })
            );

        await assert.rejects(
            client.lookup({
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "row-1"
                ]
            }),
            error =>
                error.code ===
                    "connector_processing_unavailable" &&
                error.httpStatus === 503
        );
    }
);

test(
    "unexpected returned key is rejected",
    async () => {
        const client =
            createClient(
                async () => ({
                    ok: true,
                    status: 200,
                    async json() {
                        return {
                            status: "found",
                            records: [
                                {
                                    sourceRecordKey:
                                        "other-row"
                                }
                            ]
                        };
                    }
                })
            );

        await assert.rejects(
            client.lookup({
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "row-1"
                ]
            }),
            error =>
                error.code ===
                "server_trust_boundary_invalid_response"
        );
    }
);

test(
    "duplicate returned key is rejected",
    async () => {
        const client =
            createClient(
                async () => ({
                    ok: true,
                    status: 200,
                    async json() {
                        return {
                            status: "found",
                            records: [
                                {
                                    sourceRecordKey:
                                        "row-1"
                                },
                                {
                                    sourceRecordKey:
                                        "row-1"
                                }
                            ]
                        };
                    }
                })
            );

        await assert.rejects(
            client.lookup({
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "row-1"
                ]
            }),
            error =>
                error.code ===
                "server_trust_boundary_invalid_response"
        );
    }
);
