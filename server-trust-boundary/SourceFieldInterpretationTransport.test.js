"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationTransport =
    require("./SourceFieldInterpretationTransport");

function createTransport(handleResult = {
    statusCode: 200,
    body: {
        status: "created"
    }
}) {
    const calls = [];

    const transport =
        new SourceFieldInterpretationTransport({
            httpAdapter: {
                async handle(input) {
                    calls.push(input);
                    return handleResult;
                }
            },
            credentialTransport: {
                extract(value) {
                    if (value === "Bearer secret") {
                        return "secret";
                    }

                    return null;
                }
            }
        });

    return {
        transport,
        calls
    };
}

test("passes trusted envelope to adapter", async () => {
    const {
        transport,
        calls
    } =
        createTransport();

    const sourceFieldInterpretation = {
        sourceDocumentKey:
            "source-document-1",
        sourceFieldKey:
            "sheet:0:column:4",
        interpretationStatus:
            "confirmed",
        mappingStatus:
            "no_standard_match",
        confirmedMeaning:
            null
    };

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                "X-Risen-Connector-Id":
                    " connector-1 ",
                authorization:
                    "Bearer secret"
            },
            body: {
                sourceFieldInterpretation
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

    assert.equal(
        calls[0].connectorId,
        "connector-1"
    );

    assert.equal(
        calls[0].credential,
        "secret"
    );

    assert.deepEqual(
        calls[0].sourceFieldInterpretation,
        sourceFieldInterpretation
    );
});

test("rejects missing connector identity", async () => {
    const {
        transport,
        calls
    } =
        createTransport();

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                authorization:
                    "Bearer secret"
            },
            body: {
                sourceFieldInterpretation: {}
            }
        });

    assert.equal(
        result.httpStatus,
        401
    );

    assert.equal(
        calls.length,
        0
    );
});

test("rejects malformed envelope", async () => {
    const {
        transport,
        calls
    } =
        createTransport();

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-1",
                authorization:
                    "Bearer secret"
            },
            body: {
                sourceFieldInterpretation: {},
                extra: true
            }
        });

    assert.equal(
        result.httpStatus,
        400
    );

    assert.equal(
        calls.length,
        0
    );
});
