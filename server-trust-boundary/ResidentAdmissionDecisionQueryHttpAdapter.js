"use strict";

class ResidentAdmissionDecisionQueryHttpAdapter {
    constructor({ queryService, diagnosticLogger } = {}) {
        if (!queryService || typeof queryService.list !== "function") {
            throw new Error("ResidentAdmissionDecisionQueryHttpAdapter requires queryService");
        }

        this.queryService = queryService;
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

    async handle(input = {}) {
        let result;

        try {
            result = await this.queryService.list(input);
        } catch {
            this.diagnoseError(
                input.requestId,
                "resident_admission_query_application_exception"
            );
            return this.createSafeProcessingError(input.requestId);
        }

        if (!result || typeof result !== "object" || Array.isArray(result)) {
            this.diagnoseError(
                input.requestId,
                "resident_admission_query_result_invalid"
            );
            return this.createSafeProcessingError(input.requestId);
        }

        if (result.status === "found" && Array.isArray(result.decisions)) {
            return {
                statusCode: 200,
                body: {
                    status: "found",
                    decisions: result.decisions
                }
            };
        }

        if (result.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId: input.requestId,
                    status: "denied",
                    errorCode: "connector_trust_denied"
                }
            };
        }

        if (result.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId: input.requestId,
                    status: "invalid",
                    errorCode: "resident_admission_query_invalid"
                }
            };
        }

        this.diagnoseError(
            input.requestId,
            typeof result.errorCode === "string"
                ? result.errorCode
                : "resident_admission_query_error"
        );

        return this.createSafeProcessingError(input.requestId);
    }
}

module.exports = ResidentAdmissionDecisionQueryHttpAdapter;
