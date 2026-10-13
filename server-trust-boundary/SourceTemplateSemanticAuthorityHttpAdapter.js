"use strict";

class SourceTemplateSemanticAuthorityHttpAdapter {
    constructor({
        ingestionService
    } = {}) {
        if (
            !ingestionService ||
            typeof ingestionService.ingest !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateSemanticAuthorityHttpAdapter requires ingestionService"
            );
        }

        this.ingestionService =
            ingestionService;
    }

    async handleQuery(input = {}) {
        if (
            typeof this.ingestionService.list !==
            "function"
        ) {
            return {
                statusCode: 503,
                body: {
                    requestId:
                        input.requestId,
                    status: "error",
                    errorCode:
                        "connector_processing_unavailable"
                }
            };
        }

        const result =
            await this.ingestionService.list(
                input
            );

        if (result?.status === "found") {
            return {
                statusCode: 200,
                body: result
            };
        }

        if (result?.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId:
                        input.requestId,
                    status: "denied",
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        if (result?.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId:
                        input.requestId,
                    status: "invalid",
                    errorCode:
                        "source_template_semantic_authority_invalid"
                }
            };
        }

        return {
            statusCode: 503,
            body: {
                requestId:
                    input.requestId,
                status: "error",
                errorCode:
                    "connector_processing_unavailable"
            }
        };
    }

    async handle(input = {}) {
        const result =
            await this.ingestionService.ingest(
                input
            );

        if (
            [
                "created",
                "unchanged",
                "conflict"
            ].includes(result?.status)
        ) {
            return {
                statusCode: 200,
                body: result
            };
        }

        if (result?.status === "denied") {
            return {
                statusCode: 401,
                body: {
                    requestId:
                        input.requestId,
                    status: "denied",
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        if (result?.status === "invalid") {
            return {
                statusCode: 422,
                body: {
                    requestId:
                        input.requestId,
                    status: "invalid",
                    errorCode:
                        "source_template_semantic_authority_invalid"
                }
            };
        }

        return {
            statusCode: 503,
            body: {
                requestId:
                    input.requestId,
                status: "error",
                errorCode:
                    "connector_processing_unavailable"
            }
        };
    }
}

module.exports =
    SourceTemplateSemanticAuthorityHttpAdapter;
