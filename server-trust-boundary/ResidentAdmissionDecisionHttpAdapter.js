"use strict";

class ResidentAdmissionDecisionHttpAdapter {
    constructor({ persistenceService, diagnosticLogger } = {}) {
        if (!persistenceService || typeof persistenceService.save !== "function") {
            throw new Error("ResidentAdmissionDecisionHttpAdapter requires persistenceService");
        }
        this.persistenceService = persistenceService;
        this.diagnosticLogger =
            diagnosticLogger && typeof diagnosticLogger.error === "function"
                ? diagnosticLogger
                : null;
    }

    diagnoseError(requestId, internalErrorCode) {
        if (!this.diagnosticLogger) return;
        try {
            this.diagnosticLogger.error({
                requestId,
                status: "error",
                internalErrorCode
            });
        } catch {
        }
    }

    createSafeProcessingError(requestId) {
        return {
            statusCode: 503,
            body: {
                requestId,
                status: "error",
                errorCode: "connector_processing_unavailable"
            }
        };
    }

    async handle({
        requestId,
        connectorId,
        credential,
        decision
    } = {}) {
        let result;

        try {
            result = await this.persistenceService.save({
                connectorId,
                credential,
                decision
            });
        } catch {
            this.diagnoseError(
                requestId,
                "resident_admission_application_exception"
            );
            return this.createSafeProcessingError(requestId);
        }

        if (!result || typeof result !== "object" || Array.isArray(result)) {
            this.diagnoseError(
                requestId,
                "resident_admission_result_invalid"
            );
            return this.createSafeProcessingError(requestId);
        }

        if (["created", "updated", "unchanged"].includes(result.status)) {
            return {
                statusCode: 200,
                body: { status: result.status }
            };
        }

        if (result.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId,
                    status: "denied",
                    errorCode: "connector_trust_denied"
                }
            };
        }

        if (result.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId,
                    status: "invalid",
                    errorCode: "resident_admission_decision_invalid"
                }
            };
        }

        this.diagnoseError(
            requestId,
            typeof result.errorCode === "string"
                ? result.errorCode
                : "resident_admission_error"
        );

        return this.createSafeProcessingError(requestId);
    }
}

module.exports = ResidentAdmissionDecisionHttpAdapter;
