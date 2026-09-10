"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ServerTrustBoundaryHttpAdapter =
    require("./ServerTrustBoundaryHttpAdapter");

function createAdapter(result) {
    return new ServerTrustBoundaryHttpAdapter({
        ingestionService: {
            async ingest() {
                return result;
            }
        }
    });
}

test("requires ingestion application service", () => {
    assert.throws(
        () =>
            new ServerTrustBoundaryHttpAdapter(),
        /requires ingestionService/
    );
});

test("matched response exposes status only with requestId", async () => {
    const adapter =
        createAdapter({
            status: "matched",
            residentId: "resident-secret",
            matchMethod: "facility_user_code"
        });

    const response =
        await adapter.handle({
            requestId: "request-1"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-1",
            status: "matched"
        }
    );
});

test("needs_review never exposes candidates", async () => {
    const adapter =
        createAdapter({
            status: "needs_review",
            residentId: null,
            candidates: [
                {
                    id: "candidate-secret"
                }
            ]
        });

    const response =
        await adapter.handle({
            requestId: "request-2"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-2",
            status: "needs_review"
        }
    );
});

test("unmatched returns minimal response", async () => {
    const adapter =
        createAdapter({
            status: "unmatched",
            residentId: null
        });

    const response =
        await adapter.handle({
            requestId: "request-3"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-3",
            status: "unmatched"
        }
    );
});

test("passes only explicit application fields", async () => {
    let received;

    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            ingestionService: {
                async ingest(input) {
                    received = input;

                    return {
                        status: "unmatched"
                    };
                }
            }
        });

    const payload = {
        sourceResident: {
            identifier: {
                value: "RES-123"
            }
        }
    };

    const semanticRecords = [{
        semanticContent: {
            semanticType: "support_record"
        }
    }];

    await adapter.handle({
        requestId: "request-4",
        connectorId: "connector-id",
        credential: "credential-secret",
        payload,
        semanticRecords,

        verifiedContext: {
            facilityId:
                "client-override"
        },
        residentId:
            "client-resident",
        token:
            "client-token"
    });

    assert.deepStrictEqual(
        received,
        {
            connectorId: "connector-id",
            credential: "credential-secret",
            payload,
            semanticRecords
        }
    );
});

test("denied internal error is replaced by external allowlist", async () => {
    const adapter =
        createAdapter({
            status: "denied",
            errorCode:
                "internal_registration_detail"
        });

    assert.deepStrictEqual(
        await adapter.handle({
            requestId: "request-5"
        }),
        {
            requestId: "request-5",
            status: "denied",
            errorCode:
                "connector_trust_denied"
        }
    );
});

test("invalid internal error is replaced by external allowlist", async () => {
    const adapter =
        createAdapter({
            status: "invalid",
            errorCode:
                "internal_validation_detail"
        });

    assert.deepStrictEqual(
        await adapter.handle({
            requestId: "request-6"
        }),
        {
            requestId: "request-6",
            status: "invalid",
            errorCode:
                "connector_payload_invalid"
        }
    );
});

test("internal error is diagnosed but never exposed", async () => {
    const events = [];

    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            ingestionService: {
                async ingest() {
                    return {
                        status: "error",
                        errorCode:
                            "semantic_ingestion_rejected",
                        secret:
                            "must-not-leak"
                    };
                }
            },
            diagnosticLogger: {
                error(event) {
                    events.push(event);
                }
            }
        });

    const response =
        await adapter.handle({
            requestId: "request-7",
            credential: "secret-value"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-7",
            status: "error",
            errorCode:
                "connector_processing_unavailable"
        }
    );

    assert.deepStrictEqual(
        events,
        [{
            requestId: "request-7",
            status: "error",
            internalErrorCode:
                "semantic_ingestion_rejected"
        }]
    );

    assert.equal(
        JSON.stringify(events)
            .includes("secret-value"),
        false
    );
});

test("application exception is sanitized", async () => {
    const events = [];

    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            ingestionService: {
                async ingest() {
                    throw new Error(
                        "database password"
                    );
                }
            },
            diagnosticLogger: {
                error(event) {
                    events.push(event);
                }
            }
        });

    const response =
        await adapter.handle({
            requestId: "request-8"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-8",
            status: "error",
            errorCode:
                "connector_processing_unavailable"
        }
    );

    assert.deepStrictEqual(
        events,
        [{
            requestId: "request-8",
            status: "error",
            internalErrorCode:
                "ingestion_application_exception"
        }]
    );
});

test("unknown application result fails closed", async () => {
    const adapter =
        createAdapter({
            status: "unexpected",
            secret: "must-not-leak"
        });

    const response =
        await adapter.handle({
            requestId: "request-9"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-9",
            status: "error",
            errorCode:
                "internal_result_invalid"
        }
    );
});

test("diagnostic logger failure never affects response", async () => {
    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            ingestionService: {
                async ingest() {
                    return {
                        status: "error",
                        errorCode:
                            "internal_failure"
                    };
                }
            },
            diagnosticLogger: {
                error() {
                    throw new Error(
                        "diagnostic backend unavailable"
                    );
                }
            }
        });

    assert.deepStrictEqual(
        await adapter.handle({
            requestId: "request-10"
        }),
        {
            requestId: "request-10",
            status: "error",
            errorCode:
                "connector_processing_unavailable"
        }
    );
});
