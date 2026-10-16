"use strict";

class SemanticProjectionContractHttpAdapter {
    constructor({
        queryService
    } = {}) {
        if (
            !queryService ||
            typeof queryService.query !==
                "function"
        ) {
            throw new Error(
                "SemanticProjectionContractHttpAdapter requires queryService"
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
            Array.isArray(result.contracts)
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
                        "semantic_projection_contract_invalid"
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
    SemanticProjectionContractHttpAdapter;
