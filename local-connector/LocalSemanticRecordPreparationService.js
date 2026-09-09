"use strict";

const path = require("node:path");

class LocalSemanticRecordPreparationService {
    constructor({
        localConnectorService,
        semanticRecordBuilder
    } = {}) {
        if (!localConnectorService) {
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

        this.localConnectorService =
            localConnectorService;
        this.semanticRecordBuilder =
            semanticRecordBuilder;
    }

    async prepareRegisteredFile(fileName) {
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

        return this.semanticRecordBuilder.build(
            normalizedDocument,
            {
                sourceDocumentKey:
                    observation.sourceDocumentKey
            }
        );
    }
}

module.exports =
    LocalSemanticRecordPreparationService;
