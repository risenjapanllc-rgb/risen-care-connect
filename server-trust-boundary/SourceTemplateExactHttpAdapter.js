"use strict";

class SourceTemplateExactHttpAdapter {
    constructor({
        ingestionService,
        diagnosticLogger
    } = {}) {
        if (
            !ingestionService ||
            typeof ingestionService.ingest !== "function"
        ) {
            throw new Error(
                "SourceTemplateExactHttpAdapter requires ingestionService"
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
        sourceTemplateExact
    } = {}) {
        let result;

        try {
            result =
                await this.ingestionService.ingest({
                    connectorId,
                    credential,
                    sourceTemplateExact
                });
        } catch {
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
            return this.createSafeProcessingError(
                requestId
            );
        }

        if (
            [
                "created",
                "unchanged",
                "conflict"
            ].includes(result.status)
        ) {
            return {
                statusCode: 200,
                body: {
                    status:
                        result.status,
                    templateId:
                        result.templateId
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
                        "source_template_exact_invalid"
                }
            };
        }

        if (result.status === "error") {
            this.diagnoseError(
                requestId,
                result.errorCode ||
                    "connector_processing_error"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        return this.createSafeProcessingError(
            requestId
        );
    }
}

module.exports =
    SourceTemplateExactHttpAdapter;
