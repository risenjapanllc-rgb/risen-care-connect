"use strict";

const path = require("path");

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
        payloadBuilder,
        semanticRecordBuilder,
        httpClient
    } = {}) {
        if (!localConnectorService) {
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

        this.localConnectorService =
            localConnectorService;
        this.payloadBuilder =
            payloadBuilder;
        this.semanticRecordBuilder =
            semanticRecordBuilder;
        this.httpClient =
            httpClient;
    }

    async ingestRegisteredFile(fileName) {
        if (
            typeof this.localConnectorService
                .observeRegisteredFile !== "function"
        ) {
            throw new Error(
                "source document observation unavailable"
            );
        }

        const observation =
            await this.localConnectorService
                .observeRegisteredFile(fileName);

        if (
            !observation ||
            typeof observation !== "object" ||
            Array.isArray(observation) ||
            typeof observation.sourceDocumentKey !== "string" ||
            observation.sourceDocumentKey.trim() === ""
        ) {
            throw new Error(
                "sourceDocumentKey unavailable"
            );
        }

        const extension =
            typeof fileName === "string"
                ? path.extname(fileName).toLowerCase()
                : "";

        let normalizedDocument;

        if (
            extension === ".docx" ||
            extension === ".doc"
        ) {
            if (
                typeof this.localConnectorService
                    .normalizeRegisteredWord !== "function"
            ) {
                throw new Error(
                    "Word normalization unavailable"
                );
            }

            normalizedDocument =
                await this.localConnectorService
                    .normalizeRegisteredWord(fileName);
        } else if (
            extension === ".xlsx" ||
            extension === ".xls"
        ) {
            if (
                typeof this.localConnectorService
                    .normalizeRegisteredExcel !== "function"
            ) {
                throw new Error(
                    "Excel normalization unavailable"
                );
            }

            normalizedDocument =
                await this.localConnectorService
                    .normalizeRegisteredExcel(fileName);
        } else {
            throw new Error(
                "unsupported file type"
            );
        }

        const payload =
            this.payloadBuilder.build(
                normalizedDocument
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
                normalizedDocument,
                {
                    sourceDocumentKey:
                        observation.sourceDocumentKey
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
