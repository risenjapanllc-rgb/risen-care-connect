"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldMappingTransport =
    require("./SourceFieldMappingTransport");

const ConnectorCredentialTransport =
    require("./ConnectorCredentialTransport");

function createTransport({
    adapterResult = {
        statusCode: 200,
        body: {
            status: "created"
        }
    }
} = {}) {
    let received;

    const httpAdapter = {
        async handle(input) {
            received = input;
            return adapterResult;
        }
    };

    const credentialTransport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "Connector"
        });

    return {
        transport:
            new SourceFieldMappingTransport({
                httpAdapter,
                credentialTransport,
                connectorIdHeader:
                    "x-risencare-connector-id"
            }),

        getReceived:
            () => received
    };
}

function validRequest() {
    return {
        method:
            "POST",
        contentType:
            "application/json",
        headers: {
            authorization:
                "Connector test-credential",
            "x-risencare-connector-id":
                "connector-id"
        },
        body: {
            sourceFieldMapping: {
                sourceFieldMappingKey:
                    "source-document-key",
                sourceType:
                    "csv",
                fileName:
                    "source.csv",
                sourceContent: {
                    rows: [
                        ["A", "B"],
                        ["1", "2"]
                    ]
                },
                sourceUpdatedAt:
                    null,
                sourceSize:
                    123,
                observedAt:
                    "2026-09-11T10:01:00.000Z"
            }
        }
    };
}

test("requires dependencies", () => {
    assert.throws(
        () =>
            new SourceFieldMappingTransport(),
        /requires httpAdapter/
    );
});

test("passes authenticated transport fields to adapter", async () => {
    const {
        transport,
        getReceived
    } = createTransport();

    const request =
        validRequest();

    const result =
        await transport.handle(request);

    assert.deepStrictEqual(
        result,
        {
            httpStatus: 200,
            body: {
                status: "created"
            }
        }
    );

    const received =
        getReceived();

    assert.equal(
        typeof received.requestId,
        "string"
    );

    assert.ok(
        received.requestId.trim().length > 0
    );

    assert.deepStrictEqual(
        {
            connectorId:
                received.connectorId,
            credential:
                received.credential,
            sourceFieldMapping:
                received.sourceFieldMapping
        },
        {
            connectorId:
                "connector-id",
            credential:
                "test-credential",
            sourceFieldMapping:
                request.body.sourceFieldMapping
        }
    );
});

test("rejects body with additional top-level keys", async () => {
    const {
        transport,
        getReceived
    } = createTransport();

    const request =
        validRequest();

    request.body.facilityId =
        "client-supplied-facility";

    const result =
        await transport.handle(request);

    assert.strictEqual(
        result.httpStatus,
        400
    );

    assert.strictEqual(
        result.body.errorCode,
        "malformed_json"
    );

    assert.strictEqual(
        typeof result.body.requestId,
        "string"
    );

    assert.strictEqual(
        getReceived(),
        undefined
    );
});

test("rejects missing sourceFieldMapping", async () => {
    const {
        transport,
        getReceived
    } = createTransport();

    const request =
        validRequest();

    request.body = {};

    const result =
        await transport.handle(request);

    assert.strictEqual(
        result.httpStatus,
        400
    );

    assert.strictEqual(
        result.body.errorCode,
        "malformed_json"
    );

    assert.strictEqual(
        typeof result.body.requestId,
        "string"
    );

    assert.strictEqual(
        getReceived(),
        undefined
    );
});

test("rejects missing connector id header", async () => {
    const {
        transport,
        getReceived
    } = createTransport();

    const request =
        validRequest();

    delete request.headers[
        "x-risencare-connector-id"
    ];

    const result =
        await transport.handle(request);

    assert.strictEqual(
        result.httpStatus,
        401
    );

    assert.strictEqual(
        result.body.errorCode,
        "connector_trust_denied"
    );

    assert.strictEqual(
        typeof result.body.requestId,
        "string"
    );

    assert.strictEqual(
        getReceived(),
        undefined
    );
});

test("rejects invalid authorization scheme", async () => {
    const {
        transport,
        getReceived
    } = createTransport();

    const request =
        validRequest();

    request.headers.authorization =
        "Bearer test-credential";

    const result =
        await transport.handle(request);

    assert.strictEqual(
        result.httpStatus,
        401
    );

    assert.strictEqual(
        result.body.errorCode,
        "connector_trust_denied"
    );

    assert.strictEqual(
        typeof result.body.requestId,
        "string"
    );

    assert.strictEqual(
        getReceived(),
        undefined
    );
});

test("supports shared app error-response contract", () => {
    const {
        transport
    } = createTransport();

    const result =
        transport.createErrorResponse({
            httpStatus: 413,
            errorCode:
                "payload_too_large"
        });

    assert.strictEqual(
        result.httpStatus,
        413
    );

    assert.strictEqual(
        result.body.errorCode,
        "payload_too_large"
    );

    assert.strictEqual(
        typeof result.body.requestId,
        "string"
    );
});

test("does not expose credential in response", async () => {
    const {
        transport
    } = createTransport({
        adapterResult: {
            statusCode: 503,
            body: {
                status: "error"
            }
        }
    });

    const result =
        await transport.handle(
            validRequest()
        );

    assert.strictEqual(
        JSON.stringify(result).includes(
            "test-credential"
        ),
        false
    );
});
