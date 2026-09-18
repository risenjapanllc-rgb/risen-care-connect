"use strict";

class ConnectorSupportRecordWriteHttpAdapter {
    constructor({
        writeService,
        diagnosticLogger
    } = {}) {
        if (
            !writeService ||
            typeof writeService.write !== "function"
        ) {
            throw new Error(
                "ConnectorSupportRecordWriteHttpAdapter requires writeService"
            );
        }

        this.writeService = writeService;
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
        operation
    } = {}) {
        let result;

        try {
            result =
                await this.writeService.write({
                    connectorId,
                    credential,
                    operation
                });
        } catch {
            this.diagnoseError(
                requestId,
                "support_record_write_application_exception"
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
                "support_record_write_result_invalid"
            );
            return this.safeError(requestId);
        }

        if (
            result.status === "created" ||
            result.status === "updated" ||
            result.status === "unchanged"
        ) {
            return {
                statusCode: 200,
                body: {
                    status: result.status
                }
            };
        }

        if (
            result.status === "conflict" ||
            result.status ===
                "resident_mismatch"
        ) {
            return {
                statusCode: 409,
                body: {
                    status: result.status
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
                        "support_record_write_invalid"
                }
            };
        }

        this.diagnoseError(
            requestId,
            typeof result.errorCode === "string"
                ? result.errorCode
                : "support_record_write_error"
        );

        return this.safeError(requestId);
    }
}

module.exports =
    ConnectorSupportRecordWriteHttpAdapter;
