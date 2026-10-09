"use strict";

class LogicalSourceSemanticHttpAdapter {
    constructor({
        persistenceService
    } = {}) {
        if (
            !persistenceService ||
            typeof persistenceService.persist !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceSemanticHttpAdapter requires persistenceService"
            );
        }

        this.persistenceService =
            persistenceService;
    }

    async handle(input = {}) {
        const result =
            await this.persistenceService
                .persist(input);

        if (
            [
                "created",
                "updated",
                "unchanged",
                "conflict"
            ].includes(
                result?.status
            )
        ) {
            return {
                statusCode:
                    200,
                body: {
                    status:
                        result.status,
                    recordId:
                        result.recordId ??
                        null
                }
            };
        }

        if (
            result?.status ===
                "invalid"
        ) {
            return {
                statusCode:
                    422,
                body: {
                    errorCode:
                        result.errorCode
                }
            };
        }

        return {
            statusCode:
                result?.status ===
                    "denied"
                    ? 401
                    : 503,
            body: {
                errorCode:
                    result?.errorCode ||
                    "logical_source_semantic_persistence_unavailable"
            }
        };
    }
}

module.exports =
    LogicalSourceSemanticHttpAdapter;
