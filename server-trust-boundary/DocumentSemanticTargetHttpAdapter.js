"use strict";

class DocumentSemanticTargetHttpAdapter {
    constructor({
        queryService
    } = {}) {
        if (
            !queryService ||
            typeof queryService.query !==
                "function"
        ) {
            throw new Error(
                "DocumentSemanticTargetHttpAdapter requires queryService"
            );
        }

        this.queryService =
            queryService;
    }

    async handleQuery(input = {}) {
        const result =
            await this.queryService.query(
                input
            );

        if (
            result?.status === "found" &&
            Array.isArray(result.targets)
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
                        "document_semantic_target_invalid"
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
    DocumentSemanticTargetHttpAdapter;
