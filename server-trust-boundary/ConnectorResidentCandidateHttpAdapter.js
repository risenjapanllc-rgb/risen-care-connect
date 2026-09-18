"use strict";

class ConnectorResidentCandidateHttpAdapter {
    constructor({
        candidateService,
        diagnosticLogger
    } = {}) {
        if (
            !candidateService ||
            typeof candidateService.findCandidates !== "function"
        ) {
            throw new Error(
                "ConnectorResidentCandidateHttpAdapter requires candidateService"
            );
        }

        this.candidateService =
            candidateService;

        this.diagnosticLogger =
            diagnosticLogger &&
            typeof diagnosticLogger.error === "function"
                ? diagnosticLogger
                : null;
    }

    diagnoseError(requestId, internalErrorCode) {
        if (!this.diagnosticLogger) {
            return;
        }

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
                errorCode:
                    "connector_processing_unavailable"
            }
        };
    }

    async handle({
        requestId,
        connectorId,
        credential,
        userCode,
        name
    } = {}) {
        let result;

        try {
            result =
                await this.candidateService
                    .findCandidates({
                        connectorId,
                        credential,
                        userCode,
                        name
                    });
        } catch {
            this.diagnoseError(
                requestId,
                "resident_candidate_application_exception"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result)
        ) {
            this.diagnoseError(
                requestId,
                "resident_candidate_result_invalid"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        if (result.status === "ok") {
            return {
                statusCode: 200,
                body: {
                    status: "ok",
                    candidates:
                        Array.isArray(result.candidates)
                            ? result.candidates
                            : []
                }
            };
        }

        if (result.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId,
                    status: "denied",
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        if (result.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId,
                    status: "invalid",
                    errorCode:
                        "resident_candidate_query_invalid"
                }
            };
        }

        if (result.status === "error") {
            const internalErrorCode =
                typeof result.errorCode === "string" &&
                result.errorCode.trim()
                    ? result.errorCode.trim()
                    : "resident_candidate_query_error";

            this.diagnoseError(
                requestId,
                internalErrorCode
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        this.diagnoseError(
            requestId,
            "resident_candidate_result_invalid"
        );

        return this.createSafeProcessingError(
            requestId
        );
    }
}

module.exports =
    ConnectorResidentCandidateHttpAdapter;
