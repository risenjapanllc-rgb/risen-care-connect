const path = require('path');
const LocalFolderScanner = require('./LocalFolderScanner');
const LocalConnectorConfig = require('./LocalConnectorConfig');

class LocalConnectorService {
    constructor(options = {}) {
        this.scanner =
            options.scanner ||
            new LocalFolderScanner();

        this.config =
            options.config ||
            new LocalConnectorConfig();
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

    async resolveRegisteredExcelFile(fileName) {
        if (
            typeof fileName !== 'string' ||
            fileName.trim() === ''
        ) {
            throw new Error(
                'Excelファイル名が指定されていません'
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
                    file.fileName === fileName &&
                    (
                        file.extension === '.xlsx' ||
                        file.extension === '.xls'
                    )
            );

        if (!matchedFile) {
            throw new Error(
                '登録フォルダ内の対象Excelが見つかりません'
            );
        }

        const resolvedPath =
            path.resolve(
                allowedFolder,
                matchedFile.fileName
            );

        const allowedRoot =
            path.resolve(allowedFolder) +
            path.sep;

        if (
            !resolvedPath.startsWith(
                allowedRoot
            )
        ) {
            throw new Error(
                '登録フォルダ外のファイルは参照できません'
            );
        }

        return resolvedPath;
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
