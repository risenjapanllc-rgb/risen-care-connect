"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Adapter =
    require("./ConnectorSemanticRecordPreviewHttpAdapter");
const Transport =
    require("./ConnectorSemanticRecordPreviewTransport");

function createTransport(result) {
    const calls = [];

    const adapter =
        new Adapter({
            previewService: {
                async lookup(input) {
                    calls.push(input);
                    return result;
                }
            }
        });

    return {
        calls,
        transport:
            new Transport({
                httpAdapter: adapter,
                credentialTransport: {
                    extract(value) {
                        return value ===
                            "RISEN-Connector secret"
                            ? "secret"
                            : null;
                    }
                }
            })
    };
}

test(
    "valid preview request reaches service",
    async () => {
        const { transport, calls } =
            createTransport({
                status: "found",
                records: []
            });

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys: [
                        "row-1",
                        "row-2"
                    ]
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );
        assert.equal(
            calls.length,
            1
        );
        assert.deepEqual(
            calls[0].sourceRecordKeys,
            ["row-1", "row-2"]
        );
    }
);

test(
    "invalid body is rejected before service",
    async () => {
        const { transport, calls } =
            createTransport({
                status: "found",
                records: []
            });

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys: [
                        "row-1",
                        "row-1"
                    ]
                }
            });

        assert.equal(
            result.httpStatus,
            422
        );
        assert.equal(
            calls.length,
            0
        );
    }
);

test(
    "denied result becomes 401",
    async () => {
        const { transport } =
            createTransport({
                status: "denied"
            });

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys: [
                        "row-1"
                    ]
                }
            });

        assert.equal(
            result.httpStatus,
            401
        );
    }
);

test(
    "internal error becomes safe 503",
    async () => {
        const { transport } =
            createTransport({
                status: "error",
                errorCode:
                    "private_internal_detail"
            });

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "RISEN-Connector secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys: [
                        "row-1"
                    ]
                }
            });

        assert.equal(
            result.httpStatus,
            503
        );
        assert.equal(
            result.body.errorCode,
            "connector_processing_unavailable"
        );
        assert.equal(
            JSON.stringify(result.body)
                .includes(
                    "private_internal_detail"
                ),
            false
        );
    }
);
