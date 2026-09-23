"use strict";

class ConnectorSemanticLogicalRecordPersistenceHttpAdapter {
    constructor({
        service,
        diagnosticLogger
    } = {}) {
        if (!service || typeof service.persist !== "function") {
            throw new Error("ConnectorSemanticLogicalRecordPersistenceHttpAdapter requires service");
        }

        this.service = service;
        this.diagnosticLogger =
            diagnosticLogger &&
            typeof diagnosticLogger.error === "function"
                ? diagnosticLogger
                : null;
    }

    async handle(input = {}) {
        let result;

        try {
            result = await this.service.persist(input);
        } catch {
            result = {
                status: "error",
                errorCode: "semantic_logical_record_persistence_unavailable"
            };
        }

        if (
            ["created", "updated", "unchanged"].includes(
                result?.status
            )
        ) {
            return {
                statusCode: 200,
                body: {
                    status: result.status,
                    recordId: result.recordId
                }
            };
        }

        if (
            result?.status === "stale" ||
            result?.status === "conflict"
        ) {
            return {
                statusCode: 409,
                body: {
                    status: result.status,
                    recordId: result.recordId || null
                }
            };
        }

        if (result?.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId: input.requestId,
                    status: "denied",
                    errorCode: "connector_trust_denied"
                }
            };
        }

        if (result?.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId: input.requestId,
                    status: "invalid",
                    errorCode:
                        "semantic_logical_record_persistence_invalid"
                }
            };
        }

        if (this.diagnosticLogger) {
            try {
                this.diagnosticLogger.error({
                    requestId: input.requestId,
                    status: "error",
                    internalErrorCode:
                        result?.errorCode ||
                        "semantic_logical_record_persistence_unavailable"
                });
            } catch {
            }
        }

        return {
            statusCode: 503,
            body: {
                requestId: input.requestId,
                status: "error",
                errorCode: "connector_processing_unavailable"
            }
        };
    }
}

module.exports =
    ConnectorSemanticLogicalRecordPersistenceHttpAdapter;
