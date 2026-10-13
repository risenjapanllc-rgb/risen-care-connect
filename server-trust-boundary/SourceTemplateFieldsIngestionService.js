"use strict";

class SourceTemplateFieldsIngestionService {
    constructor({
        connectorTrustService,
        payloadValidator,
        persistenceRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateFieldsIngestionService requires connectorTrustService"
            );
        }

        if (
            !payloadValidator ||
            typeof payloadValidator.validate !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateFieldsIngestionService requires payloadValidator"
            );
        }

        if (
            !persistenceRepository ||
            typeof persistenceRepository.register !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateFieldsIngestionService requires persistenceRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.payloadValidator =
            payloadValidator;

        this.persistenceRepository =
            persistenceRepository;
    }

    async ingest({
        connectorId,
        credential,
        sourceTemplateFields
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            !trustResult ||
            trustResult.status !== "verified" ||
            !trustResult.verifiedContext ||
            typeof trustResult.verifiedContext.facilityId !==
                "string" ||
            typeof trustResult.verifiedContext.connectorId !==
                "string"
        ) {
            if (trustResult?.status === "denied") {
                return {
                    status: "denied"
                };
            }

            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const validation =
            this.payloadValidator
                .validate(
                    sourceTemplateFields
                );

        if (
            !validation ||
            validation.status !== "valid"
        ) {
            return {
                status: "invalid"
            };
        }

        let result;

        try {
            result =
                await this.persistenceRepository
                    .register({
                        verifiedFacilityId:
                            trustResult
                                .verifiedContext
                                .facilityId,

                        verifiedConnectorId:
                            trustResult
                                .verifiedContext
                                .connectorId,

                        templateId:
                            validation
                                .validatedSourceTemplateFields
                                .templateId,

                        fields:
                            validation
                                .validatedSourceTemplateFields
                                .fields
                    });
        } catch {
            return {
                status: "error",
                errorCode:
                    "source_template_fields_persistence_unavailable"
            };
        }

        if (
            result &&
            [
                "created",
                "unchanged",
                "conflict"
            ].includes(result.status)
        ) {
            return {
                status:
                    result.status,
                templateId:
                    result.templateId
            };
        }

        if (result?.status === "denied") {
            return {
                status: "denied"
            };
        }

        if (result?.status === "invalid") {
            return {
                status: "invalid"
            };
        }

        return {
            status: "error",
            errorCode:
                "source_template_fields_persistence_invalid_result"
        };
    }
}

module.exports =
    SourceTemplateFieldsIngestionService;
