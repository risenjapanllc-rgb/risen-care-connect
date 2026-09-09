"use strict";

/**
 * Diagnostic logger for the Server Trust Boundary.
 *
 * Only allowlisted diagnostic metadata may leave this boundary.
 * Connector credentials, JWTs, identifiers, payloads, exception
 * messages, and stack traces must never be logged here.
 */
class ServerTrustBoundaryDiagnosticLogger {
    constructor({ write } = {}) {
        if (typeof write !== "function") {
            throw new Error(
                "ServerTrustBoundaryDiagnosticLogger requires write"
            );
        }

        this.write = write;
    }

    error(event = {}) {
        const safeEvent = {
            requestId:
                typeof event.requestId === "string"
                    ? event.requestId
                    : "",
            status: "error",
            internalErrorCode:
                typeof event.internalErrorCode === "string"
                    ? event.internalErrorCode
                    : "diagnostic_error_unspecified"
        };

        this.write(safeEvent);
    }
}

module.exports =
    ServerTrustBoundaryDiagnosticLogger;
