"use strict";

class LocalSourceDocumentIngestionService {
    constructor({
        sourceAdapter,
        httpClient,
        clock = () => new Date()
    } = {}) {
        if (
            !sourceAdapter ||
            typeof sourceAdapter.observe !== "function" ||
            typeof sourceAdapter.acquireRaw !== "function"
        ) {
            throw new Error(
                "LocalSourceDocumentIngestionService requires sourceAdapter"
            );
        }

        if (
            !httpClient ||
            typeof httpClient.ingest !== "function"
        ) {
            throw new Error(
                "LocalSourceDocumentIngestionService requires httpClient"
            );
        }

        if (typeof clock !== "function") {
            throw new Error(
                "LocalSourceDocumentIngestionService requires clock"
            );
        }

        this.sourceAdapter =
            sourceAdapter;

        this.httpClient =
            httpClient;

        this.clock =
            clock;
    }

    async ingestRegisteredFile(relativePath) {
        if (
            typeof relativePath !== "string" ||
            relativePath.trim() === ""
        ) {
            throw new TypeError(
                "relativePath is required"
            );
        }

        const observation =
            await this.sourceAdapter.observe(
                relativePath
            );

        if (
            !observation ||
            typeof observation !== "object" ||
            typeof observation
                .sourceDocumentKey !== "string" ||
            observation
                .sourceDocumentKey
                .trim() === ""
        ) {
            throw new Error(
                "sourceDocumentKey unavailable"
            );
        }

        const raw =
            await this.sourceAdapter.acquireRaw(
                relativePath
            );

        if (
            !raw ||
            typeof raw !== "object" ||
            typeof raw.sourceType !== "string" ||
            raw.sourceType.trim() === "" ||
            !raw.source ||
            typeof raw.source !== "object" ||
            typeof raw.source.fileName !== "string" ||
            raw.source.fileName.trim() === ""
        ) {
            throw new Error(
                "raw source unavailable"
            );
        }

        const sourceDocument = {
            sourceDocumentKey:
                observation
                    .sourceDocumentKey
                    .trim(),

            sourceType:
                raw.sourceType.trim(),

            fileName:
                raw.source.fileName.trim(),

            sourceContent:
                this.buildSourceContent(
                    raw.sourceType,
                    raw.document
                ),

            sourceUpdatedAt:
                raw.source.updatedAt || null,

            sourceSize:
                Number.isInteger(
                    raw.source.size
                ) &&
                raw.source.size >= 0
                    ? raw.source.size
                    : null,

            observedAt:
                this.clock()
                    .toISOString()
        };

        return await this.httpClient.ingest(
            sourceDocument
        );
    }

    buildSourceContent(
        sourceType,
        document = {}
    ) {
        if (sourceType === "word") {
            return {
                text:
                    typeof document.text === "string"
                        ? document.text
                        : ""
            };
        }

        if (
            sourceType === "excel" ||
            sourceType === "csv"
        ) {
            return {
                sheetNames:
                    Array.isArray(
                        document.sheetNames
                    )
                        ? document.sheetNames
                        : [],

                sheets:
                    Array.isArray(
                        document.sheets
                    )
                        ? document.sheets
                        : []
            };
        }

        return {
            raw:
                document &&
                typeof document === "object"
                    ? document
                    : {}
        };
    }
}

module.exports =
    LocalSourceDocumentIngestionService;
