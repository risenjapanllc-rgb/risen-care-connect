"use strict";

class SourceDocumentIngestionService {
    constructor({
        connectorTrustService,
        sourceDocumentPayloadValidator,
        sourceDocumentPersistenceRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "SourceDocumentIngestionService requires connectorTrustService"
            );
        }

        if (
            !sourceDocumentPayloadValidator ||
            typeof sourceDocumentPayloadValidator.validate !== "function"
        ) {
            throw new Error(
                "SourceDocumentIngestionService requires sourceDocumentPayloadValidator"
            );
        }

        if (
            !sourceDocumentPersistenceRepository ||
            typeof sourceDocumentPersistenceRepository.upsert !== "function"
        ) {
            throw new Error(
                "SourceDocumentIngestionService requires sourceDocumentPersistenceRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.sourceDocumentPayloadValidator =
            sourceDocumentPayloadValidator;

        this.sourceDocumentPersistenceRepository =
            sourceDocumentPersistenceRepository;
    }

    async ingest({
        connectorId,
        credential,
        sourceDocument
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

        if (
            !this.isValidVerifiedContext(
                verifiedContext
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
                this.sourceDocumentPayloadValidator
                    .validate(sourceDocument);
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "source_document_validation_unavailable"
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
                    "source_document_validation_invalid_result"
            };
        }

        if (validationResult.status !== "valid") {
            if (validationResult.status === "invalid") {
                return {
                    status: "invalid",
                    errorCode:
                        validationResult.errorCode ||
                        "source_document_invalid"
                };
            }

            return {
                status: "error",
                errorCode:
                    "source_document_validation_invalid_result"
            };
        }

        const validatedSourceDocument =
            validationResult.validatedSourceDocument;

        if (
            !validatedSourceDocument ||
            typeof validatedSourceDocument !== "object" ||
            Array.isArray(validatedSourceDocument)
        ) {
            return {
                status: "error",
                errorCode:
                    "source_document_validation_invalid_result"
            };
        }

        let persistenceResult;

        try {
            persistenceResult =
                await this.sourceDocumentPersistenceRepository
                    .upsert({
                        verifiedFacilityId:
                            verifiedContext.facilityId,
                        verifiedConnectorId:
                            verifiedContext.connectorId,
                        sourceDocumentKey:
                            validatedSourceDocument.sourceDocumentKey,
                        sourceType:
                            validatedSourceDocument.sourceType,
                        fileName:
                            validatedSourceDocument.fileName,
                        sourceContent:
                            validatedSourceDocument.sourceContent,
                        sourceUpdatedAt:
                            validatedSourceDocument.sourceUpdatedAt,
                        sourceSize:
                            validatedSourceDocument.sourceSize,
                        observedAt:
                            validatedSourceDocument.observedAt
                    });
        } catch (error) {
            const httpStatus =
                error &&
                Number.isInteger(error.httpStatus) &&
                error.httpStatus >= 400 &&
                error.httpStatus <= 599
                    ? error.httpStatus
                    : null;

            const errorCode =
                httpStatus !== null
                    ? `source_document_persistence_http_${httpStatus}`
                    : "source_document_persistence_unavailable";

            const persistencePhase =
                error &&
                typeof error.persistencePhase === "string" &&
                [
                    "prepare",
                    "upload",
                    "finalize"
                ].includes(
                    error.persistencePhase
                )
                    ? error.persistencePhase
                    : null;

            return {
                status: "error",
                errorCode,
                ...(persistencePhase
                    ? { persistencePhase }
                    : {})
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
                    "source_document_persistence_invalid_result"
            };
        }

        if (
            [
                "created",
                "updated",
                "unchanged"
            ].includes(
                persistenceResult.status
            )
        ) {
            return {
                status:
                    persistenceResult.status
            };
        }

        if (
            persistenceResult.status === "denied"
        ) {
            return {
                status: "denied",
                errorCode:
                    "source_document_persistence_denied"
            };
        }

        if (
            persistenceResult.status === "invalid"
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_document_invalid"
            };
        }

        return {
            status: "error",
            errorCode:
                "source_document_persistence_invalid_result"
        };
    }

    isValidVerifiedContext(
        verifiedContext
    ) {
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
    SourceDocumentIngestionService;
