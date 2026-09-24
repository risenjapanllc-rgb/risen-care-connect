"use strict";

class RecipientCertificateAtomicPersistenceHttpAdapter {
    constructor({
        service,
        diagnosticLogger
    } = {}) {
        if (!service || typeof service.persist !== "function") {
            throw new Error(
                "RecipientCertificateAtomicPersistenceHttpAdapter requires service"
            );
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
                errorCode:
                    "recipient_certificate_atomic_persistence_unavailable"
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
                    residentId: result.residentId || null,
                    recordId: result.recordId || null,
                    residentCreated:
                        result.residentCreated === true
                }
            };
        }

        if (
            [
                "stale",
                "conflict",
                "name_conflict",
                "user_code_conflict",
                "not_approved"
            ].includes(result?.status)
        ) {
            return {
                statusCode: 409,
                body: {
                    status: result.status,
                    residentId: result.residentId || null,
                    recordId: result.recordId || null,
                    residentCreated: false
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
                        "recipient_certificate_atomic_persistence_invalid"
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
                        "recipient_certificate_atomic_persistence_unavailable"
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
    RecipientCertificateAtomicPersistenceHttpAdapter;
