const path = require('path');
const LocalFolderScanner = require('./LocalFolderScanner');
const LocalConnectorConfig = require('./LocalConnectorConfig');
const ExcelReader = require('./ExcelReader');
const WordReader = require('./WordReader');
const DocumentTypeDetector = require('./DocumentTypeDetector');
const DocumentNormalizer = require('./DocumentNormalizer');

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

        this.wordReader =
            options.wordReader ||
            new WordReader();

        this.documentTypeDetector =
            options.documentTypeDetector ||
            new DocumentTypeDetector();

        this.documentNormalizer =
            options.documentNormalizer ||
            new DocumentNormalizer();
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

    async _resolveRegisteredFileDetails(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'ファイル名が指定されていません'
            );
        }

        if (
            fileName.includes('/') ||
            fileName.includes('\\') ||
            path.isAbsolute(fileName)
        ) {
            throw new Error(
                'フォルダを含むファイル名は指定できません'
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
                    file.fileName === fileName
            );

        if (!matchedFile) {
            throw new Error(
                '登録フォルダ内の対象ファイルが見つかりません'
            );
        }

        const filePath =
            path.resolve(
                allowedFolder,
                matchedFile.fileName
            );

        const allowedRoot =
            path.resolve(allowedFolder) +
            path.sep;

        if (
            !filePath.startsWith(
                allowedRoot
            )
        ) {
            throw new Error(
                '登録フォルダ外のファイルは参照できません'
            );
        }

        return {
            filePath,
            fileName:
                matchedFile.fileName,
            extension:
                matchedFile.extension,
            size:
                matchedFile.size,
            updatedAt:
                matchedFile.updatedAt
        };
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

        return this.documentNormalizer.normalize({
            sourceType: 'word',
            fileName:
                details.fileName,
            updatedAt:
                details.updatedAt,
            document,
            documentType
        });
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

        return this.documentNormalizer.normalize({
            sourceType: 'excel',
            fileName:
                details.fileName,
            updatedAt:
                details.updatedAt,
            document,
            documentType
        });
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
            files:
                scanResult.files
        };
    }
}

module.exports = LocalConnectorService;
