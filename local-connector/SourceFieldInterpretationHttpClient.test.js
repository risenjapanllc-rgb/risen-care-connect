"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationHttpClient =
    require("./SourceFieldInterpretationHttpClient");

test("sends sourceFieldInterpretation with connector trust headers only", async () => {
    const calls = [];

    const client =
        new SourceFieldInterpretationHttpClient({
            endpoint:
                "https://backend.example/connector/source-field-interpretations",
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

    const sourceFieldInterpretation = {
        sourceDocumentKey:
            "document-key",
                sourceUpdatedAt:
                    "2026-09-22T00:00:00.000Z",
                sourceSize:
                    12345,
        sourceFieldKey:
            "sheet:0:column:3",
        interpretationStatus:
            "deferred",
        mappingStatus:
            "unmapped",
        confirmedMeaning:
            null
    };

    const result =
        await client.ingest(
            sourceFieldInterpretation
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

    assert.strictEqual(
        calls[0].url,
        "https://backend.example/connector/source-field-interpretations"
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
            sourceFieldInterpretation
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
            new SourceFieldInterpretationHttpClient({
                endpoint:
                    "https://backend.example/connector/source-field-interpretations",
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
                            return {
                                status
                            };
                        }
                    })
            });

        assert.deepStrictEqual(
            await client.ingest({
                sourceDocumentKey:
                    "document-key",
                sourceUpdatedAt:
                    "2026-09-22T00:00:00.000Z",
                sourceSize:
                    12345,
                sourceFieldKey:
                    "sheet:0:column:3",
                interpretationStatus:
                    "confirmed",
                mappingStatus:
                    "no_standard_match",
                confirmedMeaning:
                    null
            }),
            {
                status
            }
        );
    }
});

test("preserves safe interpretation invalid error code", async () => {
    const client =
        new SourceFieldInterpretationHttpClient({
            endpoint:
                "https://backend.example/connector/source-field-interpretations",
            connectorId:
                "connector-id",
            credential:
                "credential-value",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
                async () => ({
                    ok: false,
                    status: 422,
                    async json() {
                        return {
                            requestId:
                                "request-1",
                            errorCode:
                                "source_field_interpretation_invalid"
                        };
                    }
                })
        });

    await assert.rejects(
        () =>
            client.ingest({
                sourceDocumentKey:
                    "document-key",
                sourceUpdatedAt:
                    "2026-09-22T00:00:00.000Z",
                sourceSize:
                    12345,
                sourceFieldKey:
                    "sheet:0:column:3",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            }),
        error => {
            assert.strictEqual(
                error.code,
                "source_field_interpretation_invalid"
            );

            assert.strictEqual(
                error.httpStatus,
                422
            );

            assert.strictEqual(
                error.requestId,
                "request-1"
            );

            return true;
        }
    );
});

test("lists persisted source field interpretations", async () => {
    let request = null;

    const client =
        new SourceFieldInterpretationHttpClient({
            endpoint:
                "http://127.0.0.1:8787/connector/source-field-interpretations",
            connectorId:
                "connector-1",
            credential:
                "credential-1",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
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
                                    },
                                    {
                                        sourceFieldKey:
                                            "sheet:0:column:2",
                                        interpretationStatus:
                                            "confirmed",
                                        mappingStatus:
                                            "no_standard_match",
                                        confirmedMeaning:
                                            null,
                                        confirmedByHuman:
                                            true
                                    }
                                ]
                            };
                        }
                    };
                }
        });

    const result =
        await client.list({
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345
        });

    const url =
        new URL(request.url);

    assert.equal(
        request.options.method,
        "GET"
    );

    assert.equal(
        url.pathname,
        "/connector/source-field-interpretations"
    );

    assert.equal(
        url.searchParams.get(
            "sourceDocumentKey"
        ),
        "source-document-1"
    );

    assert.equal(
        url.searchParams.get(
            "sourceUpdatedAt"
        ),
        "2026-09-22T00:00:00.000Z"
    );

    assert.equal(
        url.searchParams.get(
            "sourceSize"
        ),
        "12345"
    );

    assert.equal(
        result.status,
        "found"
    );

    assert.equal(
        result.interpretations.length,
        2
    );

    assert.equal(
        result.interpretations[0]
            .interpretationStatus,
        "deferred"
    );

    assert.equal(
        result.interpretations[1]
            .mappingStatus,
        "no_standard_match"
    );
});

test("rejects blank sourceDocumentKey before interpretation query", async () => {
    let called = false;

    const client =
        new SourceFieldInterpretationHttpClient({
            endpoint:
                "http://127.0.0.1:8787/connector/source-field-interpretations",
            connectorId:
                "connector-1",
            credential:
                "credential-1",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
                async () => {
                    called = true;
                    throw new Error(
                        "must not be called"
                    );
                }
        });

    await assert.rejects(
        () => client.list({
            sourceDocumentKey: "   ",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345
        }),
        /valid source snapshot is required/
    );

    assert.equal(
        called,
        false
    );
});
