"use strict";

class ResidentCreationHttpAdapter {
    constructor({
        residentCreationService,
        diagnosticLogger
    } = {}) {
        if (
            !residentCreationService ||
            typeof residentCreationService.create !== "function"
        ) {
            throw new Error(
                "ResidentCreationHttpAdapter requires residentCreationService"
            );
        }

        this.residentCreationService =
            residentCreationService;
        this.diagnosticLogger =
            diagnosticLogger &&
            typeof diagnosticLogger.error === "function"
                ? diagnosticLogger
                : null;
    }

    async handle({
        requestId,
        connectorId,
        credential,
        resident
    } = {}) {
        let result;

        try {
            result =
                await this.residentCreationService.create({
                    connectorId,
                    credential,
                    resident
                });
        } catch {
            return this.createProcessingError(requestId);
        }

        if (
            result?.status === "created" ||
            result?.status === "existing"
        ) {
            return {
                statusCode: 200,
                body: {
                    status: result.status,
                    resident: result.resident
                }
            };
        }

        if (result?.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId,
                    status: "denied",
                    errorCode: "connector_trust_denied"
                }
            };
        }

        if (result?.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId,
                    status: "invalid",
                    errorCode: "resident_creation_invalid"
                }
            };
        }

        if (result?.status === "ambiguous") {
            return {
                statusCode: 409,
                body: {
                    requestId,
                    status: "ambiguous",
                    errorCode: "resident_name_ambiguous"
                }
            };
        }

        return this.createProcessingError(requestId);
    }

    createProcessingError(requestId) {
        if (this.diagnosticLogger) {
            try {
                this.diagnosticLogger.error({
                    requestId,
                    status: "error",
                    internalErrorCode:
                        "resident_creation_unavailable"
                });
            } catch {
            }
        }

        return {
            statusCode: 503,
            body: {
                requestId,
                status: "error",
                errorCode:
                    "connector_processing_unavailable"
            }
        };
    }
}

module.exports = ResidentCreationHttpAdapter;
