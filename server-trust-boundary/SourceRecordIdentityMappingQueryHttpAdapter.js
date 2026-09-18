"use strict";

class SourceRecordIdentityMappingQueryHttpAdapter {
    constructor({
        queryService,
        diagnosticLogger
    } = {}) {
        if (
            !queryService ||
            typeof queryService.get !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityMappingQueryHttpAdapter requires queryService"
            );
        }

        this.queryService =
            queryService;

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

    createSafeProcessingError(
        requestId
    ) {
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
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        let result;

        try {
            result =
                await this.queryService.get({
                    connectorId,
                    credential,
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });
        } catch {
            this.diagnoseError(
                requestId,
                "source_record_identity_mapping_query_application_exception"
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
                "source_record_identity_mapping_query_result_invalid"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        if (result.status === "found") {
            return {
                statusCode: 200,
                body: {
                    status: "found",
                    mapping:
                        result.mapping ?? null
                }
            };
        }

        if (result.status === "not_found") {
            return {
                statusCode: 200,
                body: {
                    status: "not_found",
                    mapping: null
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
                        "source_record_identity_mapping_query_invalid"
                }
            };
        }

        if (result.status === "error") {
            const internalErrorCode =
                typeof result.errorCode === "string" &&
                result.errorCode.trim()
                    ? result.errorCode.trim()
                    : "source_record_identity_mapping_query_error";

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
            "source_record_identity_mapping_query_result_invalid"
        );

        return this.createSafeProcessingError(
            requestId
        );
    }
}

module.exports =
    SourceRecordIdentityMappingQueryHttpAdapter;
