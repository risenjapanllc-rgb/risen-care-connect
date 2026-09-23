"use strict";

class SourceFieldInterpretationIngestionService {
    constructor({
        connectorTrustService,
        sourceFieldInterpretationPayloadValidator,
        sourceFieldInterpretationPersistenceRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationIngestionService requires connectorTrustService"
            );
        }

        if (
            !sourceFieldInterpretationPayloadValidator ||
            typeof sourceFieldInterpretationPayloadValidator.validate !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationIngestionService requires sourceFieldInterpretationPayloadValidator"
            );
        }

        if (
            !sourceFieldInterpretationPersistenceRepository ||
            typeof sourceFieldInterpretationPersistenceRepository.confirm !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationIngestionService requires sourceFieldInterpretationPersistenceRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.sourceFieldInterpretationPayloadValidator =
            sourceFieldInterpretationPayloadValidator;

        this.sourceFieldInterpretationPersistenceRepository =
            sourceFieldInterpretationPersistenceRepository;
    }

    async ingest({
        connectorId,
        credential,
        sourceFieldInterpretation
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService.authenticate({
                    connectorId,
                    credential
                });
        } catch (error) {
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

        if (trustResult.status === "error") {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (trustResult.status !== "verified") {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const verifiedContext =
            trustResult.verifiedContext;

        if (!this.isValidVerifiedContext(verifiedContext)) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        let validationResult;

        try {
            validationResult =
                this.sourceFieldInterpretationPayloadValidator
                    .validate(sourceFieldInterpretation);
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "source_field_interpretation_validation_unavailable"
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
                    "source_field_interpretation_validation_invalid_result"
            };
        }

        if (validationResult.status !== "valid") {
            if (validationResult.status === "invalid") {
                return {
                    status: "invalid",
                    errorCode:
                        validationResult.errorCode ||
                        "source_field_interpretation_invalid"
                };
            }

            return {
                status: "error",
                errorCode:
                    "source_field_interpretation_validation_invalid_result"
            };
        }

        const validated =
            validationResult.validatedSourceFieldInterpretation;

        if (
            !validated ||
            typeof validated !== "object" ||
            Array.isArray(validated)
        ) {
            return {
                status: "error",
                errorCode:
                    "source_field_interpretation_validation_invalid_result"
            };
        }

        let persistenceResult;

        try {
            persistenceResult =
                await this.sourceFieldInterpretationPersistenceRepository
                    .confirm({
                        verifiedFacilityId:
                            verifiedContext.facilityId,
                        verifiedConnectorId:
                            verifiedContext.connectorId,
                        sourceDocumentKey:
                            validated.sourceDocumentKey,
                        sourceUpdatedAt:
                            validated.sourceUpdatedAt,
                        sourceSize:
                            validated.sourceSize,
                        sourceFieldKey:
                            validated.sourceFieldKey,
                        interpretationStatus:
                            validated.interpretationStatus,
                        mappingStatus:
                            validated.mappingStatus,
                        confirmedMeaning:
                            validated.confirmedMeaning
                    });
        } catch (error) {
            console.error({
                event: "source_field_interpretation_persistence_failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "unknown persistence error"
            });

            return {
                status: "error",
                errorCode:
                    "source_field_interpretation_persistence_unavailable"
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
                    "source_field_interpretation_persistence_invalid_result"
            };
        }

        if (
            [
                "created",
                "updated",
                "unchanged"
            ].includes(persistenceResult.status)
        ) {
            return {
                status:
                    persistenceResult.status
            };
        }

        if (persistenceResult.status === "denied") {
            return {
                status: "denied",
                errorCode:
                    "source_field_interpretation_persistence_denied"
            };
        }

        if (persistenceResult.status === "invalid") {
            return {
                status: "invalid",
                errorCode:
                    "source_field_interpretation_invalid"
            };
        }

        return {
            status: "error",
            errorCode:
                "source_field_interpretation_persistence_invalid_result"
        };
    }

    isValidVerifiedContext(verifiedContext) {
        return Boolean(
            verifiedContext &&
            typeof verifiedContext === "object" &&
            !Array.isArray(verifiedContext) &&
            typeof verifiedContext.connectorId === "string" &&
            verifiedContext.connectorId.trim() &&
            typeof verifiedContext.facilityId === "string" &&
            verifiedContext.facilityId.trim()
        );
    }
}

module.exports =
    SourceFieldInterpretationIngestionService;
