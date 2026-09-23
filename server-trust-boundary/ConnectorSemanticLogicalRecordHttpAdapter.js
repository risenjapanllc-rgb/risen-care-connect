"use strict";

class ConnectorSemanticLogicalRecordHttpAdapter {
    constructor({
        service,
        diagnosticLogger
    } = {}) {
        if (!service || typeof service.lookup !== "function") {
            throw new Error("ConnectorSemanticLogicalRecordHttpAdapter requires service");
        }

        this.service = service;
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
        residentId,
        semanticType,
        logicalSlot
    } = {}) {
        let result;

        try {
            result = await this.service.lookup({
                connectorId,
                credential,
                residentId,
                semanticType,
                logicalSlot
            });
        } catch {
            result = {
                status: "error",
                errorCode: "semantic_logical_record_unavailable"
            };
        }

        if (result?.status === "found") {
            return {
                statusCode: 200,
                body: {
                    status: "found",
                    record: result.record
                }
            };
        }

        if (result?.status === "not_found") {
            return {
                statusCode: 200,
                body: {
                    status: "not_found",
                    record: null
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
                    errorCode: "semantic_logical_record_invalid"
                }
            };
        }

        if (this.diagnosticLogger) {
            try {
                this.diagnosticLogger.error({
                    requestId,
                    status: "error",
                    internalErrorCode:
                        typeof result?.errorCode === "string"
                            ? result.errorCode
                            : "semantic_logical_record_unavailable"
                });
            } catch {
            }
        }

        return {
            statusCode: 503,
            body: {
                requestId,
                status: "error",
                errorCode: "connector_processing_unavailable"
            }
        };
    }
}

module.exports =
    ConnectorSemanticLogicalRecordHttpAdapter;
