"use strict";

class ConnectorSemanticRecordPreviewHttpAdapter {
    constructor({
        previewService,
        diagnosticLogger
    } = {}) {
        if (
            !previewService ||
            typeof previewService.lookup !== "function"
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewHttpAdapter requires previewService"
            );
        }

        this.previewService = previewService;
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

    safeError(requestId) {
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
        sourceRecordKeys
    } = {}) {
        let result;

        try {
            result =
                await this.previewService.lookup({
                    connectorId,
                    credential,
                    sourceDocumentKey,
                    sourceRecordKeys
                });
        } catch {
            this.diagnoseError(
                requestId,
                "semantic_record_preview_application_exception"
            );
            return this.safeError(requestId);
        }

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result)
        ) {
            this.diagnoseError(
                requestId,
                "semantic_record_preview_result_invalid"
            );
            return this.safeError(requestId);
        }

        if (
            result.status === "found" &&
            Array.isArray(result.records)
        ) {
            if (this.diagnosticLogger) {
                try {
                    this.diagnosticLogger.error({
                        requestId,
                        diagnostic:
                            "semantic_record_preview_count",
                        requestedCount:
                            Array.isArray(sourceRecordKeys)
                                ? sourceRecordKeys.length
                                : 0,
                        returnedCount:
                            result.records.length
                    });
                } catch {
                }
            }

            return {
                statusCode: 200,
                body: {
                    status: "found",
                    records: result.records
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
                        "semantic_record_preview_invalid"
                }
            };
        }

        if (result.status === "error") {
            this.diagnoseError(
                requestId,
                typeof result.errorCode === "string"
                    ? result.errorCode
                    : "semantic_record_preview_error"
            );
            return this.safeError(requestId);
        }

        this.diagnoseError(
            requestId,
            "semantic_record_preview_result_invalid"
        );
        return this.safeError(requestId);
    }
}

module.exports =
    ConnectorSemanticRecordPreviewHttpAdapter;
