"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldMappingQueryTransport =
    require("./SourceFieldMappingQueryTransport");

function createTransport({
    onAdapter
} = {}) {
    return new SourceFieldMappingQueryTransport({
        httpAdapter: {
            async handle(input) {
                if (onAdapter) {
                    return onAdapter(input);
                }

                return {
                    statusCode: 200,
                    body: {
                        status: "found",
                        mappings: []
                    }
                };
            }
        },
        credentialTransport: {
            extract(value) {
                assert.equal(
                    value,
                    "RISEN-Connector credential-1"
                );

                return "credential-1";
            }
        }
    });
}

test("passes trusted GET mapping query to adapter", async () => {
    let adapterInput = null;

    const transport =
        createTransport({
            onAdapter(input) {
                adapterInput = input;

                return {
                    statusCode: 200,
                    body: {
                        status: "found",
                        mappings: []
                    }
                };
            }
        });

    const result =
        await transport.handle({
            method: "GET",
            headers: {
                "x-risen-connector-id":
                    "connector-1",
                authorization:
                    "RISEN-Connector credential-1"
            },
            query: {
                sourceDocumentKey:
                    "source-document-1",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    "9520"
            }
        });

    assert.equal(
        result.httpStatus,
        200
    );

    assert.equal(
        adapterInput.connectorId,
        "connector-1"
    );

    assert.equal(
        adapterInput.credential,
        "credential-1"
    );

    assert.equal(
        adapterInput.sourceDocumentKey,
        "source-document-1"
    );

    assert.equal(
        adapterInput.sourceUpdatedAt,
        "2026-09-15T02:30:00.000Z"
    );

    assert.equal(
        adapterInput.sourceSize,
        9520
    );
});


test("rejects invalid mapping snapshot query", async () => {
    for (const query of [
        {
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "not-a-timestamp",
            sourceSize:
                "9520"
        },
        {
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                "-1"
        },
        {
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                "1.5"
        },
        {
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                ""
        }
    ]) {
        let adapterCalled = false;

        const transport =
            createTransport({
                onAdapter() {
                    adapterCalled = true;

                    return {
                        statusCode: 200,
                        body: {
                            status: "found",
                            mappings: []
                        }
                    };
                }
            });

        const result =
            await transport.handle({
                method: "GET",
                headers: {
                    "x-risen-connector-id":
                        "connector-1",
                    authorization:
                        "RISEN-Connector credential-1"
                },
                query
            });

        assert.equal(
            result.httpStatus,
            422
        );

        assert.equal(
            adapterCalled,
            false
        );
    }
});

test("rejects GET without sourceDocumentKey", async () => {
    const transport =
        createTransport({
            onAdapter() {
                throw new Error(
                    "must not be called"
                );
            }
        });

    const result =
        await transport.handle({
            method: "GET",
            headers: {
                "x-risen-connector-id":
                    "connector-1",
                authorization:
                    "RISEN-Connector credential-1"
            },
            query: {}
        });

    assert.equal(
        result.httpStatus,
        422
    );

    assert.equal(
        result.body.errorCode,
        "source_field_mapping_query_invalid"
    );
});

test("rejects browser facility or connector scope in mapping query", async () => {
    for (const extraInput of [
        {
            facilityId:
                "must-not-pass"
        },
        {
            connectorId:
                "must-not-pass"
        }
    ]) {
        let adapterCalled = false;

        const transport =
            createTransport({
                onAdapter() {
                    adapterCalled = true;

                    return {
                        statusCode: 200,
                        body: {
                            status: "found",
                            mappings: []
                        }
                    };
                }
            });

        const result =
            await transport.handle({
                method: "GET",
                headers: {
                    "x-risen-connector-id":
                        "connector-1",
                    authorization:
                        "RISEN-Connector credential-1"
                },
                query: {
                    sourceDocumentKey:
                        "source-document-1",
                    ...extraInput
                }
            });

        assert.equal(
            result.httpStatus,
            422
        );

        assert.equal(
            adapterCalled,
            false
        );
    }
});
