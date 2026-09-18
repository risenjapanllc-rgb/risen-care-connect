"use strict";

class SourceResidentMappingHttpAdapter {
    constructor({
        persistenceService,
        diagnosticLogger
    } = {}) {
        if (
            !persistenceService ||
            typeof persistenceService.save !== "function"
        ) {
            throw new Error(
                "SourceResidentMappingHttpAdapter requires persistenceService"
            );
        }

        this.persistenceService =
            persistenceService;

        this.diagnosticLogger =
            diagnosticLogger &&
            typeof diagnosticLogger.error === "function"
                ? diagnosticLogger
                : null;
    }

    diagnoseError(
        requestId,
        internalErrorCode
    ) {
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
        sourceResidentMapping
    } = {}) {
        let result;

        try {
            result =
                await this.persistenceService.save({
                    connectorId,
                    credential,
                    sourceResidentMapping
                });
        } catch {
            this.diagnoseError(
                requestId,
                "source_resident_mapping_application_exception"
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
                "source_resident_mapping_result_invalid"
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
                        "source_resident_mapping_invalid"
                }
            };
        }

        if (result.status === "error") {
            const internalErrorCode =
                typeof result.errorCode === "string" &&
                result.errorCode.trim()
                    ? result.errorCode.trim()
                    : "source_resident_mapping_error";

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
            "source_resident_mapping_result_invalid"
        );

        return this.createSafeProcessingError(
            requestId
        );
    }
}

module.exports =
    SourceResidentMappingHttpAdapter;
