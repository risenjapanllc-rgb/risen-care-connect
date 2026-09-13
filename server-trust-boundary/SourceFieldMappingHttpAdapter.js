"use strict";

class SourceFieldMappingHttpAdapter {
    constructor({
        ingestionService,
        diagnosticLogger
    } = {}) {
        if (
            !ingestionService ||
            typeof ingestionService.ingest !== "function"
        ) {
            throw new Error(
                "SourceFieldMappingHttpAdapter requires ingestionService"
            );
        }

        this.ingestionService =
            ingestionService;

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
        } catch (error) {
            // Diagnostics must never affect request processing.
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
        sourceFieldMapping
    } = {}) {
        let result;

        try {
            result =
                await this.ingestionService.ingest({
                    connectorId,
                    credential,
                    sourceFieldMapping
                });
        } catch (error) {
            this.diagnoseError(
                requestId,
                "ingestion_application_exception"
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
                "application_result_invalid"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        if (
            [
                "created",
                "updated",
                "unchanged"
            ].includes(result.status)
        ) {
            return {
                statusCode: 200,
                body: {
                    status:
                        result.status
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
                        "source_field_mapping_invalid"
                }
            };
        }

        if (result.status === "error") {
            const internalErrorCode =
                typeof result.errorCode === "string" &&
                result.errorCode.trim()
                    ? result.errorCode.trim()
                    : "connector_processing_error";

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
            "application_result_invalid"
        );

        return this.createSafeProcessingError(
            requestId
        );
    }
}

module.exports =
    SourceFieldMappingHttpAdapter;
