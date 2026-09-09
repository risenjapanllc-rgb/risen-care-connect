"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ServerTrustBoundaryDiagnosticLogger =
    require("./ServerTrustBoundaryDiagnosticLogger");

test("requires write function", () => {
    assert.throws(
        () =>
            new ServerTrustBoundaryDiagnosticLogger(),
        /requires write/
    );
});

test("writes only allowlisted diagnostic fields", () => {
    const events = [];

    const logger =
        new ServerTrustBoundaryDiagnosticLogger({
            write(event) {
                events.push(event);
            }
        });

    logger.error({
        requestId: "request-123",
        status: "anything",
        internalErrorCode:
            "resident_matching_unavailable",

        connectorId: "connector-secret-id",
        facilityId: "facility-secret-id",
        credential: "secret-value",
        token: "jwt-value",
        residentId: "resident-secret-id",
        payload: {
            secret: "payload-secret"
        },
        message:
            "sensitive dependency message",
        stack:
            "sensitive stack trace"
    });

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

    for (const sensitive of [
        "connector-secret-id",
        "facility-secret-id",
        "secret-value",
        "jwt-value",
        "resident-secret-id",
        "payload-secret",
        "sensitive dependency message",
        "sensitive stack trace"
    ]) {
        assert.strictEqual(
            serialized.includes(sensitive),
            false
        );
    }
});

test("malformed diagnostic values fail safely", () => {
    const events = [];

    const logger =
        new ServerTrustBoundaryDiagnosticLogger({
            write(event) {
                events.push(event);
            }
        });

    logger.error({
        requestId: {
            secret: "must-not-leak"
        },
        internalErrorCode: null
    });

    assert.deepStrictEqual(
        events,
        [{
            requestId: "",
            status: "error",
            internalErrorCode:
                "diagnostic_error_unspecified"
        }]
    );

    assert.strictEqual(
        JSON.stringify(events)
            .includes("must-not-leak"),
        false
    );
});
