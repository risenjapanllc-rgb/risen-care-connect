const LocalFolderScanner = require('./LocalFolderScanner');

class LocalConnectorService {
    constructor(options = {}) {
        this.scanner =
            options.scanner ||
            new LocalFolderScanner();
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
