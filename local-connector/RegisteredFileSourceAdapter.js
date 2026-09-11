"use strict";

const path = require("node:path");

class RegisteredFileSourceAdapter {
    constructor({
        localConnectorService
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService
                .observeRegisteredFile !== "function"
        ) {
            throw new Error(
                "RegisteredFileSourceAdapter requires localConnectorService"
            );
        }

        this.localConnectorService =
            localConnectorService;
    }

    async acquireRaw(relativePath) {
        if (
            typeof relativePath !== "string" ||
            relativePath.trim() === ""
        ) {
            throw new TypeError(
                "relativePath is required"
            );
        }

        if (
            typeof this.localConnectorService
                .getRegisteredFileMetadata !==
                "function"
        ) {
            throw new Error(
                "registered file metadata unavailable"
            );
        }

        const metadata =
            await this.localConnectorService
                .getRegisteredFileMetadata(
                    relativePath
                );

        if (
            !metadata ||
            typeof metadata !== "object" ||
            typeof metadata.fileName !== "string" ||
            metadata.fileName.trim() === ""
        ) {
            throw new Error(
                "registered file metadata unavailable"
            );
        }

        const extension =
            path.extname(
                relativePath
            ).toLowerCase();

        if (extension === ".docx") {
            if (
                typeof this.localConnectorService
                    .readRegisteredWord !==
                    "function"
            ) {
                throw new Error(
                    "Word acquisition unavailable"
                );
            }

            return {
                sourceType: "word",
                source: {
                    fileName:
                        metadata.fileName,
                    updatedAt:
                        metadata.updatedAt || null,
                    size:
                        Number.isFinite(metadata.size)
                            ? metadata.size
                            : null
                },
                document:
                    await this.localConnectorService
                        .readRegisteredWord(
                            relativePath
                        )
            };
        }

        if (extension === ".csv") {
            if (
                typeof this.localConnectorService
                    .readRegisteredCsv !==
                    "function"
            ) {
                throw new Error(
                    "CSV acquisition unavailable"
                );
            }

            return {
                sourceType: "csv",
                source: {
                    fileName:
                        metadata.fileName,
                    updatedAt:
                        metadata.updatedAt || null,
                    size:
                        Number.isFinite(metadata.size)
                            ? metadata.size
                            : null
                },
                document:
                    await this.localConnectorService
                        .readRegisteredCsv(
                            relativePath
                        )
            };
        }

        if (
            extension === ".xls" ||
            extension === ".xlsx"
        ) {
            if (
                typeof this.localConnectorService
                    .readRegisteredExcel !==
                    "function"
            ) {
                throw new Error(
                    "Excel acquisition unavailable"
                );
            }

            return {
                sourceType: "excel",
                source: {
                    fileName:
                        metadata.fileName,
                    updatedAt:
                        metadata.updatedAt || null,
                    size:
                        Number.isFinite(metadata.size)
                            ? metadata.size
                            : null
                },
                document:
                    await this.localConnectorService
                        .readRegisteredExcel(
                            relativePath
                        )
            };
        }

        throw new Error(
            "unsupported file type"
        );
    }

    async acquire(relativePath) {
        if (
            typeof relativePath !== "string" ||
            relativePath.trim() === ""
        ) {
            throw new TypeError(
                "relativePath is required"
            );
        }

        const extension =
            path.extname(
                relativePath
            ).toLowerCase();

        let standardDocument;

        if (extension === ".docx") {
            if (
                typeof this.localConnectorService
                    .normalizeRegisteredWord !==
                "function"
            ) {
                throw new Error(
                    "Word normalization unavailable"
                );
            }

            standardDocument =
                await this.localConnectorService
                    .normalizeRegisteredWord(
                        relativePath
                    );
        } else if (
            extension === ".xls" ||
            extension === ".xlsx"
        ) {
            if (
                typeof this.localConnectorService
                    .normalizeRegisteredExcel !==
                "function"
            ) {
                throw new Error(
                    "Excel normalization unavailable"
                );
            }

            standardDocument =
                await this.localConnectorService
                    .normalizeRegisteredExcel(
                        relativePath
                    );
        } else {
            throw new Error(
                "unsupported file type"
            );
        }

        return {
            sourceType:
                standardDocument &&
                standardDocument.sourceType,
            standardDocument
        };
    }

    async observe(relativePath) {
        return await this.localConnectorService
            .observeRegisteredFile(
                relativePath
            );
    }
}

module.exports =
    RegisteredFileSourceAdapter;
