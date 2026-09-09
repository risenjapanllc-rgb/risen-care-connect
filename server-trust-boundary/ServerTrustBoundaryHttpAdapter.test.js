"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ServerTrustBoundaryHttpAdapter =
    require("./ServerTrustBoundaryHttpAdapter");

function createAdapter(result) {
    return new ServerTrustBoundaryHttpAdapter({
        connectorIngestionService: {
            async ingest() {
                return result;
            }
        }
    });
}

test("matched response exposes status only with requestId", async () => {
    const adapter =
        createAdapter({
            status: "matched",
            residentId: "resident-secret-id",
            matchMethod: "facility_user_code",
            verifiedContext: {
                facilityId: "facility-secret-id"
            }
        });

    const response =
        await adapter.handle({
            requestId: "request-id",
            connectorId: "connector-id",
            credential: "credential-secret",
            payload: {}
        });

    assert.strictEqual(
        response.status,
        "matched"
    );

    assert.strictEqual(
        response.requestId,
        "request-id"
    );

    assert.deepStrictEqual(
        Object.keys(response).sort(),
        ["requestId", "status"]
    );
});

test("needs_review never exposes candidates", async () => {
    const adapter =
        createAdapter({
            status: "needs_review",
            candidates: [
                {
                    id: "resident-id",
                    name: "private-name"
                }
            ]
        });

    const response =
        await adapter.handle({});

    assert.deepStrictEqual(
        Object.keys(response).sort(),
        ["requestId", "status"]
    );

    assert.strictEqual(
        response.status,
        "needs_review"
    );
});

test("unmatched returns minimal response", async () => {
    const adapter =
        createAdapter({
            status: "unmatched",
            residentId: null,
            candidates: []
        });

    const response =
        await adapter.handle({});

    assert.deepStrictEqual(
        Object.keys(response).sort(),
        ["requestId", "status"]
    );

    assert.strictEqual(
        response.status,
        "unmatched"
    );
});

test("error response exposes allowlisted errorCode only", async () => {
    const adapter =
        createAdapter({
            status: "error",
            errorCode:
                "connector_processing_unavailable",
            message:
                "internal database details",
            stack:
                "internal stack",
            verifiedContext: {
                facilityId: "facility-secret-id"
            }
        });

    const response =
        await adapter.handle({});

    assert.deepStrictEqual(
        Object.keys(response).sort(),
        ["errorCode", "requestId", "status"]
    );

    assert.strictEqual(
        response.errorCode,
        "connector_processing_unavailable"
    );
});

test("unknown result fails closed", async () => {
    const adapter =
        createAdapter({
            status: "unexpected",
            secret: "must-not-leak"
        });

    const response =
        await adapter.handle({});

    assert.strictEqual(
        response.status,
        "error"
    );

    assert.strictEqual(
        response.errorCode,
        "internal_result_invalid"
    );
});

test("ingestion exception is sanitized", async () => {
    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            connectorIngestionService: {
                async ingest() {
                    throw new Error(
                        "database password leaked here"
                    );
                }
            }
        });

    const response =
        await adapter.handle({});

    assert.deepStrictEqual(
        Object.keys(response).sort(),
        ["errorCode", "requestId", "status"]
    );

    assert.strictEqual(
        response.errorCode,
        "connector_processing_unavailable"
    );
});

test("passes only explicit ingestion fields", async () => {
    let received;

    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            connectorIngestionService: {
                async ingest(input) {
                    received = input;

                    return {
                        status: "unmatched"
                    };
                }
            }
        });

    const payload = {
        facilityId: "client-facility",
        residentId: "client-resident"
    };

    await adapter.handle({
        connectorId: "connector-id",
        credential: "credential-secret",
        payload,
        verifiedContext: {
            facilityId: "client-override"
        },
        token: "client-token"
    });

    assert.deepStrictEqual(
        received,
        {
            connectorId: "connector-id",
            credential: "credential-secret",
            payload
        }
    );
});

test("denied internal errorCode is replaced by external allowlist", async () => {
    const adapter =
        createAdapter({
            status: "denied",
            errorCode:
                "connector_registration_database_internal_detail"
        });

    const response =
        await adapter.handle({
            requestId: "request-id"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-id",
            status: "denied",
            errorCode:
                "connector_trust_denied"
        }
    );
});

test("invalid internal errorCode is replaced by external allowlist", async () => {
    const adapter =
        createAdapter({
            status: "invalid",
            errorCode:
                "internal_validator_detail"
        });

    const response =
        await adapter.handle({
            requestId: "request-id"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-id",
            status: "invalid",
            errorCode:
                "connector_payload_invalid"
        }
    );
});

test("error internal errorCode is never exposed", async () => {
    const adapter =
        createAdapter({
            status: "error",
            errorCode:
                "database_table_name_and_internal_detail"
        });

    const response =
        await adapter.handle({
            requestId: "request-id"
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-id",
            status: "error",
            errorCode:
                "connector_processing_unavailable"
        }
    );
});

test("internal ingestion error is diagnosed without exposing it to connector", async () => {
    const events = [];

    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            connectorIngestionService: {
                async ingest() {
                    return {
                        status: "error",
                        errorCode:
                            "resident_matching_unavailable"
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
            requestId: "request-123",
            connectorId: "connector-id",
            credential: "secret-value",
            payload: {
                sourceResident: {
                    identifier: {
                        value: "RES-123"
                    }
                }
            }
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-123",
            status: "error",
            errorCode:
                "connector_processing_unavailable"
        }
    );

    assert.deepStrictEqual(
        events,
        [{
            requestId: "request-123",
            status: "error",
            internalErrorCode:
                "resident_matching_unavailable"
        }]
    );

    const serialized =
        JSON.stringify(events);

    assert.strictEqual(
        serialized.includes("secret-value"),
        false
    );

    assert.strictEqual(
        serialized.includes("connector-id"),
        false
    );

    assert.strictEqual(
        serialized.includes("RES-123"),
        false
    );
});

test("thrown ingestion exception is diagnosed without message or stack", async () => {
    const events = [];

    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            connectorIngestionService: {
                async ingest() {
                    throw new Error(
                        "sensitive dependency failure"
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
            requestId: "request-456",
            connectorId: "connector-id",
            credential: "secret-value",
            payload: {}
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-456",
            status: "error",
            errorCode:
                "connector_processing_unavailable"
        }
    );

    assert.deepStrictEqual(
        events,
        [{
            requestId: "request-456",
            status: "error",
            internalErrorCode:
                "connector_ingestion_exception"
        }]
    );

    const serialized =
        JSON.stringify(events);

    assert.strictEqual(
        serialized.includes(
            "sensitive dependency failure"
        ),
        false
    );

    assert.strictEqual(
        serialized.includes("stack"),
        false
    );
});

test("diagnostic logger failure never affects connector response", async () => {
    const adapter =
        new ServerTrustBoundaryHttpAdapter({
            connectorIngestionService: {
                async ingest() {
                    return {
                        status: "error",
                        errorCode:
                            "connector_trust_unavailable"
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

    const response =
        await adapter.handle({
            requestId: "request-789",
            connectorId: "connector-id",
            credential: "secret-value",
            payload: {}
        });

    assert.deepStrictEqual(
        response,
        {
            requestId: "request-789",
            status: "error",
            errorCode:
                "connector_processing_unavailable"
        }
    );
});
