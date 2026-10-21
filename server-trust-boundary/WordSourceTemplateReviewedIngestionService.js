"use strict";

class WordSourceTemplateReviewedIngestionService {
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
                "WordSourceTemplateReviewedIngestionService requires connectorTrustService"
            );
        }

        if (
            !payloadValidator ||
            typeof payloadValidator.validate !==
                "function"
        ) {
            throw new Error(
                "WordSourceTemplateReviewedIngestionService requires payloadValidator"
            );
        }

        if (
            !persistenceRepository ||
            typeof persistenceRepository.register !==
                "function"
        ) {
            throw new Error(
                "WordSourceTemplateReviewedIngestionService requires persistenceRepository"
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
        wordSourceTemplateReviewed
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

        if (
            trustResult.status ===
            "denied"
        ) {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status !==
                "verified" ||
            !trustResult.verifiedContext ||
            typeof trustResult
                .verifiedContext
                .facilityId !== "string" ||
            typeof trustResult
                .verifiedContext
                .connectorId !== "string"
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        let validation;

        try {
            validation =
                this.payloadValidator
                    .validate(
                        wordSourceTemplateReviewed
                    );
        } catch {
            return {
                status: "error",
                errorCode:
                    "word_source_template_reviewed_validation_unavailable"
            };
        }

        if (
            !validation ||
            typeof validation !== "object" ||
            Array.isArray(validation)
        ) {
            return {
                status: "error",
                errorCode:
                    "word_source_template_reviewed_validation_invalid_result"
            };
        }

        if (
            validation.status ===
            "invalid"
        ) {
            return {
                status: "invalid",
                errorCode:
                    validation.errorCode ||
                    "word_source_template_reviewed_invalid"
            };
        }

        if (
            validation.status !==
                "valid" ||
            !validation
                .validatedWordSourceTemplateReviewed
        ) {
            return {
                status: "error",
                errorCode:
                    "word_source_template_reviewed_validation_invalid_result"
            };
        }

        const validated =
            validation
                .validatedWordSourceTemplateReviewed;

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

                        sourceDocumentKey:
                            validated
                                .sourceDocumentKey,

                        sourceUpdatedAt:
                            validated
                                .sourceUpdatedAt,

                        sourceSize:
                            validated
                                .sourceSize,

                        displayName:
                            validated
                                .displayName,

                        documentType:
                            validated
                                .documentType,

                        fields:
                            validated
                                .fields,

                        confirmedByHuman:
                            validated
                                .confirmedByHuman,

                        confirmedAt:
                            validated
                                .confirmedAt
                    });
        } catch {
            return {
                status: "error",
                errorCode:
                    "word_source_template_reviewed_persistence_unavailable"
            };
        }

        if (
            result &&
            [
                "created",
                "unchanged",
                "conflict"
            ].includes(
                result.status
            )
        ) {
            return {
                status:
                    result.status,

                templateId:
                    result.templateId,

                bindingId:
                    result.bindingId
            };
        }

        if (
            result?.status ===
            "denied"
        ) {
            return {
                status: "denied",
                errorCode:
                    "word_source_template_reviewed_persistence_denied"
            };
        }

        if (
            result?.status ===
            "invalid"
        ) {
            return {
                status: "invalid",
                errorCode:
                    "word_source_template_reviewed_invalid"
            };
        }

        return {
            status: "error",
            errorCode:
                "word_source_template_reviewed_persistence_invalid_result"
        };
    }
}

module.exports =
    WordSourceTemplateReviewedIngestionService;
