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

    async ingestRegisteredFile(
        relativePath,
        expectedSnapshot = null
    ) {
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

        const currentSnapshot = {
            sourceDocumentKey:
                observation
                    .sourceDocumentKey
                    .trim(),

            sourceUpdatedAt:
                typeof raw.source.updatedAt === "string" &&
                raw.source.updatedAt.trim() !== "" &&
                !Number.isNaN(
                    Date.parse(raw.source.updatedAt)
                )
                    ? new Date(
                        raw.source.updatedAt
                    ).toISOString()
                    : null,

            sourceSize:
                Number.isSafeInteger(
                    raw.source.size
                ) &&
                raw.source.size >= 0
                    ? raw.source.size
                    : null
        };

        if (expectedSnapshot !== null) {
            const expectedIsValid =
                expectedSnapshot &&
                typeof expectedSnapshot === "object" &&
                !Array.isArray(expectedSnapshot) &&
                typeof expectedSnapshot.sourceDocumentKey === "string" &&
                expectedSnapshot.sourceDocumentKey.trim() !== "" &&
                typeof expectedSnapshot.sourceUpdatedAt === "string" &&
                expectedSnapshot.sourceUpdatedAt.trim() !== "" &&
                !Number.isNaN(
                    Date.parse(
                        expectedSnapshot.sourceUpdatedAt
                    )
                ) &&
                Number.isSafeInteger(
                    expectedSnapshot.sourceSize
                ) &&
                expectedSnapshot.sourceSize >= 0;

            if (!expectedIsValid) {
                const error =
                    new Error(
                        "expected source snapshot invalid"
                    );

                error.code =
                    "source_snapshot_invalid";

                throw error;
            }

            const expectedUpdatedAt =
                new Date(
                    expectedSnapshot.sourceUpdatedAt
                ).toISOString();

            if (
                currentSnapshot.sourceDocumentKey !==
                    expectedSnapshot.sourceDocumentKey.trim() ||
                currentSnapshot.sourceUpdatedAt !==
                    expectedUpdatedAt ||
                currentSnapshot.sourceSize !==
                    expectedSnapshot.sourceSize
            ) {
                const error =
                    new Error(
                        "source snapshot changed"
                    );

                error.code =
                    "source_snapshot_changed";

                throw error;
            }
        }

        const sourceDocument = {
            sourceDocumentKey:
                currentSnapshot.sourceDocumentKey,

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
                currentSnapshot.sourceUpdatedAt,

            sourceSize:
                currentSnapshot.sourceSize,

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
