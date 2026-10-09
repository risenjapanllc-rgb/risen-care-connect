"use strict";

class LogicalSourceResidentAssociationHttpAdapter {
    constructor({
        persistenceService
    } = {}) {
        if (
            !persistenceService ||
            typeof persistenceService.persist !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceResidentAssociationHttpAdapter requires persistenceService"
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
            ].includes(result?.status)
        ) {
            return {
                statusCode: 200,
                body: {
                    status:
                        result.status
                }
            };
        }

        if (
            result?.status ===
                "invalid"
        ) {
            return {
                statusCode: 422,
                body: {
                    errorCode:
                        result.errorCode
                }
            };
        }

        if (
            result?.status ===
                "denied"
        ) {
            return {
                statusCode: 401,
                body: {
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        return {
            statusCode: 503,
            body: {
                errorCode:
                    result?.errorCode ||
                    "logical_source_resident_association_persistence_unavailable"
            }
        };
    }
}

module.exports =
    LogicalSourceResidentAssociationHttpAdapter;
