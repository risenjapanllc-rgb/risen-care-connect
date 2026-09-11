"use strict";

const LocalConnectorStandardizationPipeline =
    require("./LocalConnectorStandardizationPipeline");

class LocalSemanticRecordPreparationService {
    constructor({
        localConnectorService,
        standardizationPipeline,
        semanticRecordBuilder
    } = {}) {
        if (
            !standardizationPipeline &&
            !localConnectorService
        ) {
            throw new Error(
                "LocalSemanticRecordPreparationService requires localConnectorService"
            );
        }

        if (
            !semanticRecordBuilder ||
            typeof semanticRecordBuilder.build !== "function"
        ) {
            throw new Error(
                "LocalSemanticRecordPreparationService requires semanticRecordBuilder"
            );
        }

        this.standardizationPipeline =
            standardizationPipeline ||
            new LocalConnectorStandardizationPipeline({
                localConnectorService
            });

        if (
            typeof this.standardizationPipeline
                .processRegisteredFile !== "function"
        ) {
            throw new Error(
                "LocalSemanticRecordPreparationService requires standardizationPipeline"
            );
        }

        this.semanticRecordBuilder =
            semanticRecordBuilder;
    }

    async prepareRegisteredFile(fileName) {
        const pipelineResult =
            await this.standardizationPipeline
                .processRegisteredFile(
                    fileName
                );

        if (
            !pipelineResult ||
            !pipelineResult.source ||
            typeof pipelineResult.source
                .sourceDocumentKey !== "string" ||
            pipelineResult.source
                .sourceDocumentKey.trim() === ""
        ) {
            throw new Error(
                "sourceDocumentKey unavailable"
            );
        }

        if (
            !pipelineResult.validation ||
            pipelineResult.validation.valid !== true ||
            !pipelineResult.quality ||
            pipelineResult.quality.acceptable !== true
        ) {
            throw new Error(
                "standardized document unavailable"
            );
        }

        const standardDocument =
            pipelineResult.standardDocument;

        if (
            !standardDocument ||
            typeof standardDocument !== "object" ||
            Array.isArray(standardDocument)
        ) {
            throw new Error(
                "standardized document unavailable"
            );
        }

        return this.semanticRecordBuilder.build(
            standardDocument,
            {
                sourceDocumentKey:
                    pipelineResult.source
                        .sourceDocumentKey
            }
        );
    }
}

module.exports =
    LocalSemanticRecordPreparationService;
