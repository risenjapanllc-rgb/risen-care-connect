"use strict";

class ConnectorResidentAdmissionHttpAdapter {
    constructor({ service, diagnosticLogger } = {}) {
        if (!service || typeof service.admit !== "function") {
            throw new Error("ConnectorResidentAdmissionHttpAdapter requires service");
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
            result = await this.service.admit(input);
        } catch {
            return this.createProcessingError(input.requestId);
        }

        if (result?.status === "created" || result?.status === "existing") {
            return {
                statusCode: 200,
                body: {
                    status: result.status,
                    residentId: result.residentId,
                    residentCreated: result.residentCreated
                }
            };
        }

        if (
            result?.status === "stale" ||
            result?.status === "not_approved" ||
            result?.status === "conflict" ||
            result?.status === "name_conflict"
        ) {
            return {
                statusCode: 409,
                body: {
                    status: result.status,
                    residentId: result.residentId || null,
                    residentCreated: false
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
                    errorCode: "resident_admission_invalid"
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
                    internalErrorCode: "resident_admission_unavailable"
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

module.exports = ConnectorResidentAdmissionHttpAdapter;
