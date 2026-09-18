"use strict";

class ConnectorSupportRecordBatchWriteHttpAdapter {
    constructor({ batchWriteService, diagnosticLogger } = {}) {
        if (!batchWriteService || typeof batchWriteService.write !== "function") {
            throw new Error("ConnectorSupportRecordBatchWriteHttpAdapter requires batchWriteService");
        }

        this.batchWriteService = batchWriteService;
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

    safeError(requestId) {
        return {
            statusCode: 503,
            body: {
                requestId,
                status: "error",
                errorCode: "connector_processing_unavailable"
            }
        };
    }

    async handle({ requestId, connectorId, credential, operations } = {}) {
        let result;

        try {
            result = await this.batchWriteService.write({
                connectorId,
                credential,
                operations
            });
        } catch {
            this.diagnoseError(requestId, "support_record_batch_write_application_exception");
            return this.safeError(requestId);
        }

        if (!result || typeof result !== "object" || Array.isArray(result)) {
            this.diagnoseError(requestId, "support_record_batch_write_result_invalid");
            return this.safeError(requestId);
        }

        if (result.status === "completed") {
            return {
                statusCode: 200,
                body: {
                    status: "completed",
                    processed: result.processed,
                    created: result.created,
                    updated: result.updated,
                    unchanged: result.unchanged
                }
            };
        }

        if (result.status === "conflict" || result.status === "resident_mismatch") {
            return {
                statusCode: 409,
                body: {
                    status: result.status,
                    failedIndex: result.failedIndex,
                    processed: result.processed,
                    created: result.created,
                    updated: result.updated,
                    unchanged: result.unchanged
                }
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
                    errorCode: "support_record_batch_write_invalid"
                }
            };
        }

        this.diagnoseError(
            requestId,
            typeof result.errorCode === "string"
                ? result.errorCode
                : "support_record_batch_write_error"
        );
        return this.safeError(requestId);
    }
}

module.exports = ConnectorSupportRecordBatchWriteHttpAdapter;
