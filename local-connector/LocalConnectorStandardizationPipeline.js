"use strict";

const RegisteredFileSourceAdapter =
    require("./RegisteredFileSourceAdapter");
const DocumentTypeDetector =
    require("./DocumentTypeDetector");
const DocumentNormalizer =
    require("./DocumentNormalizer");
const StandardDocumentMapper =
    require("./StandardDocumentMapper");
const StandardDocumentValidator =
    require("./StandardDocumentValidator");
const StandardDocumentQualityEvaluator =
    require("./StandardDocumentQualityEvaluator");

class LocalConnectorStandardizationPipeline {
    constructor({
        localConnectorService,
        sourceAdapter,
        documentTypeDetector =
            new DocumentTypeDetector(),
        documentNormalizer =
            new DocumentNormalizer(),
        mapper =
            new StandardDocumentMapper(),
        validator =
            new StandardDocumentValidator(),
        qualityEvaluator =
            new StandardDocumentQualityEvaluator()
    } = {}) {
        if (
            !sourceAdapter &&
            (
                !localConnectorService ||
                typeof localConnectorService
                    .observeRegisteredFile !==
                    "function"
            )
        ) {
            throw new Error(
                "LocalConnectorStandardizationPipeline requires localConnectorService"
            );
        }

        this.sourceAdapter =
            sourceAdapter ||
            new RegisteredFileSourceAdapter({
                localConnectorService
            });

        if (
            !this.sourceAdapter ||
            typeof this.sourceAdapter.observe !==
                "function" ||
            typeof this.sourceAdapter.acquireRaw !==
                "function"
        ) {
            throw new Error(
                "LocalConnectorStandardizationPipeline requires sourceAdapter"
            );
        }

        if (
            !documentTypeDetector ||
            typeof documentTypeDetector.detect !==
                "function"
        ) {
            throw new Error(
                "LocalConnectorStandardizationPipeline requires documentTypeDetector"
            );
        }

        if (
            !documentNormalizer ||
            typeof documentNormalizer.normalize !==
                "function"
        ) {
            throw new Error(
                "LocalConnectorStandardizationPipeline requires documentNormalizer"
            );
        }

        if (
            !mapper ||
            typeof mapper.map !== "function"
        ) {
            throw new Error(
                "LocalConnectorStandardizationPipeline requires mapper"
            );
        }

        if (
            !validator ||
            typeof validator.validate !== "function"
        ) {
            throw new Error(
                "LocalConnectorStandardizationPipeline requires validator"
            );
        }

        if (
            !qualityEvaluator ||
            typeof qualityEvaluator.evaluate !==
                "function"
        ) {
            throw new Error(
                "LocalConnectorStandardizationPipeline requires qualityEvaluator"
            );
        }

        this.localConnectorService =
            localConnectorService ||
            this.sourceAdapter
                .localConnectorService;
        this.documentTypeDetector =
            documentTypeDetector;
        this.documentNormalizer =
            documentNormalizer;
        this.mapper =
            mapper;
        this.validator =
            validator;
        this.qualityEvaluator =
            qualityEvaluator;
    }

    async processRegisteredFile(relativePath) {
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
            typeof observation
                .sourceDocumentKey !== "string" ||
            observation.sourceDocumentKey.trim() === ""
        ) {
            throw new Error(
                "sourceDocumentKey unavailable"
            );
        }

        const acquisition =
            await this.sourceAdapter.acquireRaw(
                relativePath
            );

        if (
            !acquisition ||
            typeof acquisition !== "object" ||
            typeof acquisition.sourceType !==
                "string" ||
            !acquisition.source ||
            typeof acquisition.source !==
                "object" ||
            !acquisition.document ||
            typeof acquisition.document !==
                "object"
        ) {
            throw new Error(
                "source acquisition unavailable"
            );
        }

        const documentType =
            this.documentTypeDetector.detect(
                acquisition.document
            );

        const normalizedDocument =
            this.documentNormalizer.normalize({
                sourceType:
                    acquisition.sourceType,
                fileName:
                    acquisition.source.fileName,
                updatedAt:
                    acquisition.source.updatedAt,
                document:
                    acquisition.document,
                documentType
            });

        const standardDocument =
            this.mapper.map(
                normalizedDocument
            );

        const validation =
            this.validator.validate(
                standardDocument
            );

        const quality =
            this.qualityEvaluator.evaluate({
                standardDocument,
                validation
            });

        return {
            source: {
                relativePath,
                sourceDocumentKey:
                    observation.sourceDocumentKey
            },
            acquisition: {
                sourceType:
                    acquisition.sourceType
            },
            mapping: {
                documentType:
                    standardDocument.documentType,
                extracted:
                    standardDocument.extracted
            },
            validation,
            quality,
            standardDocument
        };
    }
}

module.exports =
    LocalConnectorStandardizationPipeline;
