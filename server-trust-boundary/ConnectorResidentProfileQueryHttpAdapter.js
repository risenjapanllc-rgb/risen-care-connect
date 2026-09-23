"use strict";

class ConnectorResidentProfileQueryHttpAdapter {
    constructor({ service, diagnosticLogger } = {}) {
        if (typeof service?.get !== "function") {
            throw new Error(
                "ConnectorResidentProfileQueryHttpAdapter requires service"
            );
        }

        this.service = service;
        this.diagnosticLogger =
            typeof diagnosticLogger?.error === "function"
                ? diagnosticLogger
                : null;
    }

    async handle(input = {}) {
        let result;

        try {
            result = await this.service.get(input);
        } catch {
            return this.createProcessingError(input.requestId);
        }

        if (result?.status === "found") {
            const profile = result.profile;

            if (
                !profile ||
                typeof profile !== "object" ||
                Array.isArray(profile) ||
                typeof profile.residentId !== "string" ||
                !profile.residentId.trim() ||
                typeof profile.name !== "string" ||
                !profile.name.trim()
            ) {
                return this.createProcessingError(input.requestId);
            }

            return {
                statusCode: 200,
                body: {
                    status: "found",
                    profile
                }
            };
        }

        if (result?.status === "unavailable") {
            return {
                statusCode: 200,
                body: {
                    status: "unavailable"
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
                    errorCode: "resident_profile_query_invalid"
                }
            };
        }

        return this.createProcessingError(input.requestId);
    }

    createProcessingError(requestId) {
        if (this.diagnosticLogger) {
            try {
                this.diagnosticLogger.error({
                    requestId,
                    status: "error",
                    internalErrorCode:
                        "resident_profile_query_unavailable"
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

module.exports = ConnectorResidentProfileQueryHttpAdapter;
