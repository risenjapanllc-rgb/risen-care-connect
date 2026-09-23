"use strict";

class SourceFieldInterpretationQueryHttpAdapter {
    constructor({
        queryService,
        diagnosticLogger
    } = {}) {
        if (
            !queryService ||
            typeof queryService.list !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationQueryHttpAdapter requires queryService"
            );
        }

        this.queryService =
            queryService;

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
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        let result;

        try {
            result =
                await this.queryService.list({
                    connectorId,
                    credential,
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });
        } catch {
            this.diagnoseError(
                requestId,
                "query_application_exception"
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
                "query_result_invalid"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        if (result.status === "found") {
            return {
                statusCode: 200,
                body: {
                    status: "found",
                    interpretations:
                        Array.isArray(
                            result.interpretations
                        )
                            ? result.interpretations
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
                        "source_field_interpretation_query_invalid"
                }
            };
        }

        if (result.status === "error") {
            const internalErrorCode =
                typeof result.errorCode === "string" &&
                result.errorCode.trim()
                    ? result.errorCode.trim()
                    : "source_field_interpretation_query_error";

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
            "query_result_invalid"
        );

        return this.createSafeProcessingError(
            requestId
        );
    }
}

module.exports =
    SourceFieldInterpretationQueryHttpAdapter;
