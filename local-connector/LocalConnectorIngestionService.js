"use strict";

const LocalConnectorStandardizationPipeline =
    require("./LocalConnectorStandardizationPipeline");

/**
 * Facility-side orchestration for sending a registered document
 * to the remote Server Trust Boundary.
 *
 * Responsibilities:
 *   registered file -> normalize -> allowlisted payload -> HTTP client
 *
 * Facility identity and server-side resident identity are never
 * determined or added here.
 */
class LocalConnectorIngestionService {
    constructor({
        localConnectorService,
        standardizationPipeline,
        payloadBuilder,
        semanticRecordBuilder,
        httpClient
    } = {}) {
        if (
            !standardizationPipeline &&
            !localConnectorService
        ) {
            throw new Error(
                "LocalConnectorIngestionService requires localConnectorService"
            );
        }

        if (
            !payloadBuilder ||
            typeof payloadBuilder.build !== "function"
        ) {
            throw new Error(
                "LocalConnectorIngestionService requires payloadBuilder"
            );
        }

        if (
            !semanticRecordBuilder ||
            typeof semanticRecordBuilder.build !== "function"
        ) {
            throw new Error(
                "LocalConnectorIngestionService requires semanticRecordBuilder"
            );
        }

        if (
            !httpClient ||
            typeof httpClient.ingest !== "function"
        ) {
            throw new Error(
                "LocalConnectorIngestionService requires httpClient"
            );
        }

        this.standardizationPipeline =
            standardizationPipeline ||
            new LocalConnectorStandardizationPipeline({
                localConnectorService
            });

        if (
            !this.standardizationPipeline ||
            typeof this.standardizationPipeline
                .processRegisteredFile !== "function"
        ) {
            throw new Error(
                "LocalConnectorIngestionService requires standardizationPipeline"
            );
        }

        this.payloadBuilder =
            payloadBuilder;
        this.semanticRecordBuilder =
            semanticRecordBuilder;
        this.httpClient =
            httpClient;
    }

    async ingestRegisteredFile(fileName) {
        const pipelineResult =
            await this.standardizationPipeline
                .processRegisteredFile(
                    fileName
                );

        if (
            !pipelineResult ||
            typeof pipelineResult !== "object" ||
            Array.isArray(pipelineResult) ||
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

        const payload =
            this.payloadBuilder.build(
                standardDocument
            );

        if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload)
        ) {
            throw new Error(
                "ingestion payload unavailable"
            );
        }

        const semanticRecords =
            this.semanticRecordBuilder.build(
                standardDocument,
                {
                    sourceDocumentKey:
                        pipelineResult.source
                            .sourceDocumentKey
                }
            );

        if (
            !Array.isArray(semanticRecords) ||
            semanticRecords.length === 0
        ) {
            throw new Error(
                "semantic records unavailable"
            );
        }

        return await this.httpClient.ingest({
            payload,
            semanticRecords
        });
    }
}

module.exports =
    LocalConnectorIngestionService;
