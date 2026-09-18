const path = require('path');
const LocalFolderScanner = require('./LocalFolderScanner');
const LocalConnectorConfig = require('./LocalConnectorConfig');
const ExcelReader = require('./ExcelReader');
const CsvReader = require('./CsvReader');
const WordReader = require('./WordReader');
const DocumentTypeDetector = require('./DocumentTypeDetector');
const DocumentNormalizer = require('./DocumentNormalizer');
const DocumentSemanticExtractor = require('./DocumentSemanticExtractor');
const SourceMeaningInterpreter = require('./SourceMeaningInterpreter');
const SourceFieldExtractor = require('./SourceFieldExtractor');

class LocalConnectorService {
    constructor(options = {}) {
        this.scanner =
            options.scanner ||
            new LocalFolderScanner();

        this.config =
            options.config ||
            new LocalConnectorConfig();

        this.excelReader =
            options.excelReader ||
            new ExcelReader();

        this.csvReader =
            options.csvReader ||
            new CsvReader();

        this.wordReader =
            options.wordReader ||
            new WordReader();

        this.documentTypeDetector =
            options.documentTypeDetector ||
            new DocumentTypeDetector();

        this.documentNormalizer =
            options.documentNormalizer ||
            new DocumentNormalizer();

        this.documentSemanticExtractor =
            options.documentSemanticExtractor ||
            new DocumentSemanticExtractor();

        this.sourceMeaningInterpreter =
            options.sourceMeaningInterpreter ||
            new SourceMeaningInterpreter();

        this.sourceFieldExtractor =
            options.sourceFieldExtractor ||
            new SourceFieldExtractor();

        this.sourceDocumentRegistry =
            options.sourceDocumentRegistry ||
            null;
    }

    async getConnectorId() {
        return this.config.getConnectorId();
    }

    async getRegisteredFolderStatus() {
        const allowedFolder =
            await this.config.getAllowedFolder();

        if (!allowedFolder) {
            return {
                status: 'not_configured',
                folderName: null,
                fileCount: 0,
                wordCount: 0,
                excelCount: 0,
                checkedAt:
                    new Date().toISOString(),
                files: []
            };
        }

        try {
            return await this.getFolderStatus(
                allowedFolder
            );
        } catch (error) {
            if (
                error &&
                (
                    error.code === 'ENOENT' ||
                    error.code === 'ENOTDIR'
                )
            ) {
                return {
                    status:
                        'folder_unavailable',
                    folderName:
                        path.basename(
                            allowedFolder
                        ),
                    fileCount: 0,
                    wordCount: 0,
                    excelCount: 0,
                    checkedAt:
                        new Date().toISOString(),
                    files: []
                };
            }

            throw error;
        }
    }

    async _resolveRegisteredFileDetails(relativePath) {
        if (
            typeof relativePath !== 'string' ||
            relativePath.trim() === ''
        ) {
            throw new Error(
                'ファイルの相対パスが指定されていません'
            );
        }

        const normalizedPath =
            relativePath.replaceAll('\\', '/');

        if (
            path.isAbsolute(relativePath) ||
            normalizedPath.split('/').includes('..') ||
            normalizedPath.startsWith('/')
        ) {
            throw new Error(
                '登録フォルダ外のファイルは指定できません'
            );
        }

        const allowedFolder =
            await this.config.getAllowedFolder();

        if (!allowedFolder) {
            throw new Error(
                '参照フォルダが設定されていません'
            );
        }

        const scanResult =
            await this.scanner.scan(
                allowedFolder
            );

        const matchedFile =
            scanResult.files.find(
                file =>
                    file.relativePath
                        .replaceAll('\\', '/') ===
                    normalizedPath
            );

        if (!matchedFile) {
            throw new Error(
                '登録フォルダ内の対象ファイルが見つかりません'
            );
        }

        const filePath =
            path.resolve(
                allowedFolder,
                matchedFile.relativePath
            );

        const allowedRoot =
            path.resolve(allowedFolder) +
            path.sep;

        if (
            filePath !== path.resolve(allowedFolder) &&
            !filePath.startsWith(allowedRoot)
        ) {
            throw new Error(
                '登録フォルダ外のファイルは参照できません'
            );
        }

        return {
            filePath,
            fileName:
                matchedFile.fileName,
            relativePath:
                matchedFile.relativePath,
            extension:
                matchedFile.extension,
            size:
                matchedFile.size,
            updatedAt:
                matchedFile.updatedAt
        };
    }

    async resolveSourceSnapshot({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        if (!this.sourceDocumentRegistry) {
            throw new Error(
                "Source Document Registry is not configured"
            );
        }

        if (
            typeof sourceDocumentKey !== "string" ||
            sourceDocumentKey.trim() === "" ||
            typeof sourceUpdatedAt !== "string" ||
            sourceUpdatedAt.trim() === "" ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            const error =
                new TypeError(
                    "source snapshot is invalid"
                );
            error.code =
                "source_snapshot_invalid";
            throw error;
        }

        const normalizedUpdatedAt =
            new Date(sourceUpdatedAt).toISOString();

        const registryEntry =
            await this.sourceDocumentRegistry
                .findBySourceDocumentKey(
                    sourceDocumentKey.trim()
                );

        if (!registryEntry) {
            const error =
                new Error(
                    "Source document was not found"
                );
            error.code =
                "source_document_not_found";
            throw error;
        }

        const details =
            await this._resolveRegisteredFileDetails(
                registryEntry.relativePath
            );

        const currentUpdatedAt =
            new Date(details.updatedAt).toISOString();

        if (
            currentUpdatedAt !==
                normalizedUpdatedAt ||
            details.size !== sourceSize
        ) {
            const error =
                new Error(
                    "Source document snapshot changed"
                );
            error.code =
                "source_snapshot_changed";
            throw error;
        }

        let analysis;

        if (details.extension === ".csv") {
            analysis =
                await this.normalizeRegisteredCsv(
                    registryEntry.relativePath
                );
        } else if (
            details.extension === ".xlsx" ||
            details.extension === ".xls"
        ) {
            analysis =
                await this.normalizeRegisteredExcel(
                    registryEntry.relativePath
                );
        } else {
            const error =
                new Error(
                    "Source document is not a tabular source"
                );
            error.code =
                "source_snapshot_unsupported";
            throw error;
        }

        if (
            !Array.isArray(
                analysis?.extracted
                    ?.sourceEntities
            )
        ) {
            const error =
                new Error(
                    "Source entities are unavailable"
                );
            error.code =
                "source_entities_unavailable";
            throw error;
        }

        return {
            sourceDocumentKey:
                registryEntry.sourceDocumentKey,
            sourceUpdatedAt:
                normalizedUpdatedAt,
            sourceSize,
            analysis
        };
    }

    async observeRegisteredFile(fileName) {
        if (!this.sourceDocumentRegistry) {
            throw new Error("Source Document Registry is not configured");
        }

        const details = await this._resolveRegisteredFileDetails(fileName);

        return await this.sourceDocumentRegistry.observe({
            relativePath: details.relativePath,
            fileName: details.fileName,
            updatedAt: details.updatedAt,
            size: details.size
        });
    }

    async getRegisteredFileMetadata(fileName) {
        const details =
            await this._resolveRegisteredFileDetails(
                fileName
            );

        return {
            fileName:
                details.fileName,
            extension:
                details.extension,
            size:
                details.size,
            updatedAt:
                details.updatedAt
        };
    }

    async readRegisteredExcel(fileName) {
        const filePath =
            await this.resolveRegisteredExcelFile(
                fileName
            );

        return await this.excelReader.read(
            filePath
        );
    }

    async readRegisteredCsv(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'CSVファイル名が指定されていません'
            );
        }

        const extension =
            path.extname(
                fileName
            ).toLowerCase();

        if (extension !== '.csv') {
            throw new Error(
                'CSVファイルのみ指定できます'
            );
        }

        const details =
            await this._resolveRegisteredFileDetails(
                fileName
            );

        if (
            details.extension !== '.csv'
        ) {
            throw new Error(
                'CSVファイルのみ指定できます'
            );
        }

        return await this.csvReader.read(
            details.filePath
        );
    }

    async normalizeRegisteredCsv(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'CSVファイル名が指定されていません'
            );
        }

        const extension =
            path.extname(fileName).toLowerCase();

        if (extension !== '.csv') {
            throw new Error(
                'CSVファイルのみ指定できます'
            );
        }

        const details =
            await this._resolveRegisteredFileDetails(
                fileName
            );

        const document =
            await this.csvReader.read(
                details.filePath
            );

        const documentType =
            this.documentTypeDetector.detect(
                document
            );

        const standardDocument =
            this.documentNormalizer.normalize({
                sourceType: 'csv',
                fileName:
                    details.fileName,
                updatedAt:
                    details.updatedAt,
                document,
                documentType
            });

        const extracted =
            this.documentSemanticExtractor.extract(
                standardDocument
            );

        const sourceFields =
            this.sourceFieldExtractor.extractExcelRows(
                standardDocument.content
            );

        const fieldDefinitions =
            this.sourceFieldExtractor.extractFieldDefinitions(
                standardDocument.content
            );

        const sourceEntities =
            this.sourceFieldExtractor.extractSourceEntities(
                standardDocument.content
            );

        const interpretedSourceFields =
            sourceFields.map(record => ({
                ...record,
                meanings:
                    this.sourceMeaningInterpreter.interpret(
                        record.fields
                    ).meanings
            }));

        return {
            ...standardDocument,
            extracted: {
                ...extracted,
                fieldDefinitions,
                sourceEntities,
                sourceFields:
                    interpretedSourceFields
            }
        };
    }

    async readRegisteredWord(fileName) {
        const filePath =
            await this.resolveRegisteredWordFile(
                fileName
            );

        return await this.wordReader.read(
            filePath
        );
    }

    async resolveRegisteredWordFile(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'Wordファイル名が指定されていません'
            );
        }

        const extension =
            path.extname(fileName).toLowerCase();

        if (extension !== '.docx') {
            throw new Error(
                'Wordファイルのみ指定できます'
            );
        }

        const details =
            await this._resolveRegisteredFileDetails(
                fileName
            );

        if (details.extension !== '.docx') {
            throw new Error(
                'Wordファイルのみ指定できます'
            );
        }

        return details.filePath;
    }

    async normalizeRegisteredWord(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'Wordファイル名が指定されていません'
            );
        }

        const extension =
            path.extname(fileName).toLowerCase();

        if (extension !== '.docx') {
            throw new Error(
                'Wordファイルのみ指定できます'
            );
        }

        const details =
            await this._resolveRegisteredFileDetails(
                fileName
            );

        const document =
            await this.wordReader.read(
                details.filePath
            );

        const documentType =
            this.documentTypeDetector.detect(
                document
            );

        const standardDocument =
            this.documentNormalizer.normalize({
                sourceType: 'word',
                fileName:
                    details.fileName,
                updatedAt:
                    details.updatedAt,
                document,
                documentType
            });

        const extracted =
            this.documentSemanticExtractor.extract(
                standardDocument
            );

        return {
            ...standardDocument,
            extracted
        };
    }

    async readAndDetectRegisteredWord(fileName) {
        const document =
            await this.readRegisteredWord(
                fileName
            );

        const documentType =
            this.documentTypeDetector.detect(
                document
            );

        return {
            document,
            documentType
        };
    }

    async normalizeRegisteredExcel(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'Excelファイル名が指定されていません'
            );
        }

        const extension =
            path.extname(fileName).toLowerCase();

        if (
            extension !== '.xlsx' &&
            extension !== '.xls'
        ) {
            throw new Error(
                'Excelファイルのみ指定できます'
            );
        }

        const details =
            await this._resolveRegisteredFileDetails(
                fileName
            );

        const document =
            await this.excelReader.read(
                details.filePath
            );

        const documentType =
            this.documentTypeDetector.detect(
                document
            );

        const standardDocument =
            this.documentNormalizer.normalize({
                sourceType: 'excel',
                fileName:
                    details.fileName,
                updatedAt:
                    details.updatedAt,
                document,
                documentType
            });

        const extracted =
            this.documentSemanticExtractor.extract(
                standardDocument
            );

        const sourceFields =
            this.sourceFieldExtractor.extractExcelRows(
                standardDocument.content
            );

        const fieldDefinitions =
            this.sourceFieldExtractor.extractFieldDefinitions(
                standardDocument.content
            );

        const sourceEntities =
            this.sourceFieldExtractor.extractSourceEntities(
                standardDocument.content
            );

        const interpretedSourceFields =
            sourceFields.map(record => ({
                ...record,
                meanings:
                    this.sourceMeaningInterpreter.interpret(
                        record.fields
                    ).meanings
            }));

        return {
            ...standardDocument,
            extracted: {
                ...extracted,
                fieldDefinitions,
                sourceEntities,
                sourceFields:
                    interpretedSourceFields
            }
        };
    }

    async readAndDetectRegisteredExcel(fileName) {
        const document =
            await this.readRegisteredExcel(
                fileName
            );

        const documentType =
            this.documentTypeDetector.detect(
                document
            );

        return {
            document,
            documentType
        };
    }

    async resolveRegisteredExcelFile(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'Excelファイル名が指定されていません'
            );
        }

        const extension =
            path.extname(fileName).toLowerCase();

        if (
            extension !== '.xlsx' &&
            extension !== '.xls'
        ) {
            throw new Error(
                'Excelファイルのみ指定できます'
            );
        }

        const details =
            await this._resolveRegisteredFileDetails(
                fileName
            );

        if (
            details.extension !== '.xlsx' &&
            details.extension !== '.xls'
        ) {
            throw new Error(
                'Excelファイルのみ指定できます'
            );
        }

        return details.filePath;
    }

    async getFolderStatus(folderPath) {
        const scanResult =
            await this.scanner.scan(folderPath);

        let wordCount = 0;
        let excelCount = 0;

        const files = [];

        for (const file of scanResult.files) {
            if (file.extension === '.docx') {
                wordCount += 1;
            }

            if (
                file.extension === '.xlsx' ||
                file.extension === '.xls'
            ) {
                excelCount += 1;
            }

            let changeType = null;

            if (this.sourceDocumentRegistry) {
                const observed =
                    await this.sourceDocumentRegistry.observe({
                        relativePath:
                            file.relativePath,
                        fileName:
                            file.fileName,
                        updatedAt:
                            file.updatedAt,
                        size:
                            file.size
                    });

                changeType =
                    observed.changeType;
            }

            files.push({
                ...file,
                changeType
            });
        }

        return {
            status: 'ready',
            folderName:
                scanResult.rootFolderName,
            fileCount:
                scanResult.fileCount,
            wordCount,
            excelCount,
            checkedAt:
                new Date().toISOString(),
            files
        };
    }
}

module.exports = LocalConnectorService;
