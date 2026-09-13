"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationQueryTransport =
    require("./SourceFieldInterpretationQueryTransport");

test("passes trusted GET query to adapter", async () => {
    let adapterInput = null;

    const transport =
        new SourceFieldInterpretationQueryTransport({
            httpAdapter: {
                async handle(input) {
                    adapterInput =
                        input;

                    return {
                        statusCode: 200,
                        body: {
                            status: "found",
                            interpretations: []
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
                    "source-document-1"
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
});

test("rejects GET without sourceDocumentKey", async () => {
    const transport =
        new SourceFieldInterpretationQueryTransport({
            httpAdapter: {
                async handle() {
                    throw new Error(
                        "must not be called"
                    );
                }
            },
            credentialTransport: {
                extract() {
                    return "credential-1";
                }
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
        "source_field_interpretation_query_invalid"
    );
});
