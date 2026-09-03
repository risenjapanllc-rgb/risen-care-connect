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
                        require('path').basename(
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
