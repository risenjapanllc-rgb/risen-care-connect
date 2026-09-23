"use strict";

class ConnectorResidentProfileHttpAdapter {
    constructor({ service, diagnosticLogger } = {}) {
        if (!service || typeof service.fill !== "function") {
            throw new Error("ConnectorResidentProfileHttpAdapter requires service");
        }

        this.service = service;
        this.diagnosticLogger =
            diagnosticLogger && typeof diagnosticLogger.error === "function"
                ? diagnosticLogger
                : null;
    }

    async handle(input = {}) {
        let result;

        try {
            result = await this.service.fill(input);
        } catch {
            return this.createProcessingError(input.requestId);
        }

        if (
            result?.status === "filled" ||
            result?.status === "unchanged"
        ) {
            return {
                statusCode: 200,
                body: {
                    status: result.status,
                    residentId: result.residentId
                }
            };
        }

        if (
            result?.status === "stale" ||
            result?.status === "not_confirmed" ||
            result?.status === "conflict" ||
            result?.status === "user_code_conflict"
        ) {
            return {
                statusCode: 409,
                body: {
                    status: result.status,
                    residentId: result.residentId || null
                }
            };
        }

        if (result?.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId: input.requestId,
                    status: "denied",
                    errorCode: "connector_trust_denied"
                }
            };
        }

        if (result?.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId: input.requestId,
                    status: "invalid",
                    errorCode: "resident_profile_invalid"
                }
            };
        }

        return this.createProcessingError(input.requestId);
    }

    createProcessingError(requestId) {
        if (this.diagnosticLogger) {
            try {
                this.diagnosticLogger.error({
                    requestId,
                    status: "error",
                    internalErrorCode: "resident_profile_unavailable"
                });
            } catch {
            }
        }

        return {
            statusCode: 503,
            body: {
                requestId,
                status: "error",
                errorCode: "connector_processing_unavailable"
            }
        };
    }
}

module.exports = ConnectorResidentProfileHttpAdapter;
