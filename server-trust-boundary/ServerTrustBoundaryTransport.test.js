"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ServerTrustBoundaryTransport =
    require("./ServerTrustBoundaryTransport");

const ConnectorCredentialTransport =
    require("./ConnectorCredentialTransport");

function createTransport({
    adapterResult = {
        status: "unmatched"
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
                "RISEN-Connector"
        });

    const transport =
        new ServerTrustBoundaryTransport({
            httpAdapter,
            credentialTransport
        });

    return {
        transport,
        getReceived:
            () => received
    };
}

test("requires httpAdapter", () => {
    const credentialTransport =
        new ConnectorCredentialTransport({
            authorizationScheme:
                "RISEN-Connector"
        });

    assert.throws(
        () => new ServerTrustBoundaryTransport({
            credentialTransport
        }),
        /requires httpAdapter/
    );
});

test("requires credentialTransport", () => {
    assert.throws(
        () => new ServerTrustBoundaryTransport({
            httpAdapter: {
                async handle() {}
            }
        }),
        /requires credentialTransport/
    );
});

test("rejects non-POST method", async () => {
    const { transport } =
        createTransport();

    const result =
        await transport.handle({
            method: "GET",
            contentType:
                "application/json",
            headers: {},
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        405
    );

    assert.strictEqual(
        result.body.errorCode,
        "method_not_allowed"
    );
});

test("rejects non-JSON content type", async () => {
    const { transport } =
        createTransport();

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "text/plain",
            headers: {},
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        415
    );
});

test("rejects malformed body shape", async () => {
    const { transport } =
        createTransport();

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {},
            body: []
        });

    assert.strictEqual(
        result.httpStatus,
        400
    );
});

test("rejects missing connector header", async () => {
    const { transport } =
        createTransport();

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                authorization:
                    "RISEN-Connector secret-value"
            },
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        401
    );
});

test("rejects invalid authorization scheme", async () => {
    const { transport } =
        createTransport();

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-id",
                authorization:
                    "Bearer secret-value"
            },
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        401
    );
});

test("passes extracted credential only to adapter", async () => {
    const {
        transport,
        getReceived
    } = createTransport();

    const payload = {
        sourceResident: {
            identifier: {
                value: "RES-123"
            }
        }
    };

    const semanticRecords = [{}];

    await transport.handle({
        method: "POST",
        contentType:
            "application/json",
        headers: {
            "X-RISEN-Connector-Id":
                " connector-id ",
            Authorization:
                "RISEN-Connector secret-value"
        },
        body: {
            payload,
            semanticRecords
        }
    });

    const received =
        getReceived();

    assert.strictEqual(
        typeof received.requestId,
        "string"
    );

    assert.deepStrictEqual(
        {
            connectorId:
                received.connectorId,
            credential:
                received.credential,
            payload:
                received.payload,
            semanticRecords:
                received.semanticRecords
        },
        {
            connectorId:
                "connector-id",
            credential:
                "secret-value",
            payload,
            semanticRecords
        }
    );
});

test("maps unmatched to HTTP 200", async () => {
    const { transport } =
        createTransport({
            adapterResult: {
                status: "unmatched",
                requestId: "request-id"
            }
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-id",
                authorization:
                    "RISEN-Connector secret-value"
            },
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        200
    );
});

test("maps denied to HTTP 401", async () => {
    const { transport } =
        createTransport({
            adapterResult: {
                status: "denied",
                requestId: "request-id"
            }
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-id",
                authorization:
                    "RISEN-Connector secret-value"
            },
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        401
    );
});

test("maps invalid to HTTP 422", async () => {
    const { transport } =
        createTransport({
            adapterResult: {
                status: "invalid",
                requestId: "request-id"
            }
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-id",
                authorization:
                    "RISEN-Connector secret-value"
            },
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        422
    );
});

test("maps error to HTTP 503", async () => {
    const { transport } =
        createTransport({
            adapterResult: {
                status: "error",
                requestId: "request-id"
            }
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-id",
                authorization:
                    "RISEN-Connector secret-value"
            },
            body: {
                payload: {},
                semanticRecords: [{}]
            }
        });

    assert.strictEqual(
        result.httpStatus,
        503
    );
});

test("createErrorResponse generates requestId for malformed transport input", () => {
    const { transport } =
        createTransport();

    const result =
        transport.createErrorResponse({
            httpStatus: 400,
            errorCode:
                "malformed_json"
        });

    assert.strictEqual(
        result.httpStatus,
        400
    );

    assert.strictEqual(
        typeof result.body.requestId,
        "string"
    );

    assert.strictEqual(
        result.body.errorCode,
        "malformed_json"
    );
});

test("createErrorResponse exposes only requestId and errorCode", () => {
    const { transport } =
        createTransport();

    const result =
        transport.createErrorResponse({
            httpStatus: 503,
            errorCode:
                "connector_processing_unavailable",
            secret:
                "must-not-leak"
        });

    assert.deepStrictEqual(
        Object.keys(result.body).sort(),
        ["errorCode", "requestId"]
    );
});

test(
    "splits ingestion envelope into payload and semanticRecords",
    async () => {
        const {
            transport,
            getReceived
        } = createTransport();

        const payload = {
            sourceResident: {
                identifier: {
                    value: "RES-123"
                }
            }
        };

        const semanticRecords = [{
            sourceRecordContext: {
                sourceRecordKey:
                    "support_record:primary"
            },
            semanticContent: {
                semanticType:
                    "support_record",
                fields: {
                    supportContent:
                        "支援内容"
                },
                customFields: {}
            },
            provenance: {
                documentType:
                    "support_record",
                sourceDocumentKey:
                    "document-key-123"
            }
        }];

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    "x-risen-connector-id":
                        "connector-id",
                    authorization:
                        "RISEN-Connector secret-value"
                },
                body: {
                    payload,
                    semanticRecords
                }
            });

        assert.strictEqual(
            result.httpStatus,
            200
        );

        const received =
            getReceived();

        assert.deepStrictEqual(
            {
                connectorId:
                    received.connectorId,
                credential:
                    received.credential,
                payload:
                    received.payload,
                semanticRecords:
                    received.semanticRecords
            },
            {
                connectorId:
                    "connector-id",
                credential:
                    "secret-value",
                payload,
                semanticRecords
            }
        );
    }
);

test(
    "rejects legacy unwrapped ingestion body",
    async () => {
        const {
            transport,
            getReceived
        } = createTransport();

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    "x-risen-connector-id":
                        "connector-id",
                    authorization:
                        "RISEN-Connector secret-value"
                },
                body: {
                    sourceResident: {
                        identifier: {
                            value:
                                "RES-123"
                        }
                    }
                }
            });

        assert.strictEqual(
            result.httpStatus,
            400
        );

        assert.strictEqual(
            result.body.errorCode,
            "malformed_json"
        );

        assert.strictEqual(
            getReceived(),
            undefined
        );
    }
);

test(
    "rejects envelope with client-added top-level trusted fields",
    async () => {
        const {
            transport,
            getReceived
        } = createTransport();

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    "x-risen-connector-id":
                        "connector-id",
                    authorization:
                        "RISEN-Connector secret-value"
                },
                body: {
                    payload: {},
                    semanticRecords: [{}],
                    verifiedContext: {
                        facilityId:
                            "client-facility"
                    }
                }
            });

        assert.strictEqual(
            result.httpStatus,
            400
        );

        assert.strictEqual(
            getReceived(),
            undefined
        );
    }
);
