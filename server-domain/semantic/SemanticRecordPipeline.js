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

    process({
        verifiedContext,
        semanticRecord
    } = {}) {
        const validationResult =
            this.semanticRecordValidator.validate(
                semanticRecord
            );

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

        const processingResult =
            this.semanticContentProcessor.process(
                validationResult
                    .validatedSemanticRecord
            );

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

        const identityResolution =
            this.recordIdentityResolver.resolve(
                identityContext
            );

        return {
            status:
                identityResolution?.status ||
                "invalid",
            processedSemanticRecord,
            identityResolution
        };
    }
}

module.exports =
    SemanticRecordPipeline;
