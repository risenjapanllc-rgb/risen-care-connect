"use strict";

class SourceTemplateExactIngestionService {
    constructor({
        connectorTrustService,
        sourceTemplateExactPayloadValidator,
        sourceTemplateExactPersistenceRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateExactIngestionService requires connectorTrustService"
            );
        }

        if (
            !sourceTemplateExactPayloadValidator ||
            typeof sourceTemplateExactPayloadValidator.validate !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateExactIngestionService requires sourceTemplateExactPayloadValidator"
            );
        }

        if (
            !sourceTemplateExactPersistenceRepository ||
            typeof sourceTemplateExactPersistenceRepository
                .getOrCreate !== "function"
        ) {
            throw new Error(
                "SourceTemplateExactIngestionService requires sourceTemplateExactPersistenceRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.sourceTemplateExactPayloadValidator =
            sourceTemplateExactPayloadValidator;

        this.sourceTemplateExactPersistenceRepository =
            sourceTemplateExactPersistenceRepository;
    }

    async ingest({
        connectorId,
        credential,
        sourceTemplateExact
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
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (trustResult.status === "denied") {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status !== "verified" ||
            !this.isValidVerifiedContext(
                trustResult.verifiedContext
            )
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        let validationResult;

        try {
            validationResult =
                this.sourceTemplateExactPayloadValidator
                    .validate(
                        sourceTemplateExact
                    );
        } catch {
            return {
                status: "error",
                errorCode:
                    "source_template_exact_validation_unavailable"
            };
        }

        if (
            !validationResult ||
            typeof validationResult !== "object" ||
            Array.isArray(validationResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "source_template_exact_validation_invalid_result"
            };
        }

        if (
            validationResult.status === "invalid"
        ) {
            return {
                status: "invalid",
                errorCode:
                    validationResult.errorCode ||
                    "source_template_exact_invalid"
            };
        }

        if (
            validationResult.status !== "valid" ||
            !validationResult
                .validatedSourceTemplateExact
        ) {
            return {
                status: "error",
                errorCode:
                    "source_template_exact_validation_invalid_result"
            };
        }

        const validated =
            validationResult
                .validatedSourceTemplateExact;

        let persistenceResult;

        try {
            persistenceResult =
                await this
                    .sourceTemplateExactPersistenceRepository
                    .getOrCreate({
                        verifiedFacilityId:
                            trustResult
                                .verifiedContext
                                .facilityId,

                        verifiedConnectorId:
                            trustResult
                                .verifiedContext
                                .connectorId,

                        displayName:
                            validated.displayName,

                        fileType:
                            validated.fileType,

                        documentType:
                            validated.documentType,

                        structureFingerprint:
                            validated
                                .structureFingerprint,

                        canonicalizationVersion:
                            validated
                                .canonicalizationVersion,

                        canonicalStructure:
                            validated
                                .canonicalStructure
                    });
        } catch {
            return {
                status: "error",
                errorCode:
                    "source_template_exact_persistence_unavailable"
            };
        }

        if (
            !persistenceResult ||
            typeof persistenceResult !== "object" ||
            Array.isArray(persistenceResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "source_template_exact_persistence_invalid_result"
            };
        }

        if (
            [
                "created",
                "unchanged",
                "conflict"
            ].includes(
                persistenceResult.status
            )
        ) {
            return {
                status:
                    persistenceResult.status,

                templateId:
                    persistenceResult.templateId
            };
        }

        if (
            persistenceResult.status ===
                "denied"
        ) {
            return {
                status: "denied",
                errorCode:
                    "source_template_exact_persistence_denied"
            };
        }

        if (
            persistenceResult.status ===
                "invalid"
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_template_exact_invalid"
            };
        }

        return {
            status: "error",
            errorCode:
                "source_template_exact_persistence_invalid_result"
        };
    }

    isValidVerifiedContext(value) {
        return Boolean(
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            typeof value.connectorId === "string" &&
            value.connectorId.trim() &&
            typeof value.facilityId === "string" &&
            value.facilityId.trim()
        );
    }
}

module.exports =
    SourceTemplateExactIngestionService;
