"use strict";

class SemanticRecordPipeline {
    constructor({
        semanticRecordValidator,
        semanticContentProcessor,
        recordIdentityResolver
    } = {}) {
        if (
            !semanticRecordValidator ||
            typeof semanticRecordValidator.validate !== "function"
        ) {
            throw new Error(
                "SemanticRecordPipeline requires semanticRecordValidator"
            );
        }

        if (
            !semanticContentProcessor ||
            typeof semanticContentProcessor.process !== "function"
        ) {
            throw new Error(
                "SemanticRecordPipeline requires semanticContentProcessor"
            );
        }

        if (
            !recordIdentityResolver ||
            typeof recordIdentityResolver.resolve !== "function"
        ) {
            throw new Error(
                "SemanticRecordPipeline requires recordIdentityResolver"
            );
        }

        this.semanticRecordValidator =
            semanticRecordValidator;
        this.semanticContentProcessor =
            semanticContentProcessor;
        this.recordIdentityResolver =
            recordIdentityResolver;
    }

    async process({
        verifiedContext,
        semanticRecord
    } = {}) {
        let validationResult;
        try {
            validationResult =
                this.semanticRecordValidator.validate(
                    semanticRecord
                );
        } catch {
            return this.unavailable();
        }

        if (
            !validationResult ||
            validationResult.status !== "valid"
        ) {
            return {
                status: "invalid",
                errorCode:
                    validationResult?.errorCode ||
                    "semantic_record_invalid"
            };
        }

        let processingResult;
        try {
            processingResult =
                this.semanticContentProcessor.process(
                    validationResult
                        .validatedSemanticRecord
                );
        } catch {
            return this.unavailable();
        }

        if (
            !processingResult ||
            processingResult.status !== "processed"
        ) {
            return {
                status: "invalid",
                errorCode:
                    processingResult?.errorCode ||
                    "semantic_processing_invalid"
            };
        }

        const processedSemanticRecord =
            processingResult
                .processedSemanticRecord;

        const identityContext = {
            verifiedFacilityId:
                verifiedContext?.facilityId,
            verifiedConnectorId:
                verifiedContext?.connectorId,
            sourceDocumentKey:
                processedSemanticRecord
                    ?.provenance
                    ?.sourceDocumentKey
        };

        const sourceRecordKey =
            processedSemanticRecord
                ?.sourceRecordContext
                ?.sourceRecordKey;

        if (
            typeof sourceRecordKey === "string" &&
            sourceRecordKey.trim() !== ""
        ) {
            identityContext.sourceRecordKey =
                sourceRecordKey;
        }

        let identityResolution;
        try {
            identityResolution =
                await this.recordIdentityResolver.resolve(
                    identityContext
                );
        } catch {
            return this.unavailable();
        }

        const allowedIdentityStatuses =
            new Set([
                "pending_review",
                "new_candidate",
                "conflict",
                "resolved",
                "invalid"
            ]);

        if (
            !identityResolution ||
            Array.isArray(identityResolution) ||
            typeof identityResolution !== "object" ||
            !allowedIdentityStatuses.has(
                identityResolution.status
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "semantic_identity_resolution_invalid"
            };
        }

        if (
            identityResolution.status ===
            "invalid"
        ) {
            return {
                status: "invalid",
                errorCode:
                    "semantic_identity_resolution_invalid"
            };
        }

        return {
            status:
                identityResolution.status,
            processedSemanticRecord,
            identityResolution
        };
    }

    unavailable() {
        return {
            status: "invalid",
            errorCode:
                "semantic_pipeline_unavailable"
        };
    }
}

module.exports =
    SemanticRecordPipeline;
