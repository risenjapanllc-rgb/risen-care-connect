const express = require('express');
const cors = require('cors');
const path = require('path');
const LocalConnectorCompositionRoot = require('./LocalConnectorCompositionRoot');

const app = express();
const service = LocalConnectorCompositionRoot.createService();
app.locals.localConnectorService = service;

const HOST = '127.0.0.1';
const PORT = Number(
    process.env.RISEN_LOCAL_CONNECTOR_PORT || 4310
);

app.use(cors({
    origin: [
        'http://localhost:3001',
        'http://127.0.0.1:3001'
    ]
}));

app.use(express.json({
    limit: '1mb'
}));

app.get('/', (req, res) => {
    return res.sendFile(
        path.join(__dirname, 'index.html')
    );
});

app.get('/health', (req, res) => {
    return res.json({
        success: true,
        service: 'RISEN CARE Local Connector',
        status: 'ready'
    });
});

app.get('/status', async (req, res) => {
    try {
        const result =
            await service.getRegisteredFolderStatus();

        return res.json({
            success: true,
            status: result.status,
            folderName: result.folderName,
            fileCount: result.fileCount,
            wordCount: result.wordCount,
            excelCount: result.excelCount,
            checkedAt: result.checkedAt
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message:
                'Local Connectorの状態取得に失敗しました'
        });
    }
});

app.get('/files', async (req, res) => {
    try {
        const result =
            await service.getRegisteredFolderStatus();

        if (result.status !== 'ready') {
            return res.json({
                success: true,
                status: result.status,
                folderName: result.folderName,
                fileCount: 0,
                files: []
            });
        }

        return res.json({
            success: true,
            status: result.status,
            folderName: result.folderName,
            fileCount: result.fileCount,
            files: result.files.map(file => ({
                fileName: file.fileName,
                extension: file.extension,
                size: file.size,
                updatedAt: file.updatedAt
            }))
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message:
                '対象ファイル一覧の取得に失敗しました'
        });
    }
});

app.post("/files/:fileName/observe", async (req, res) => {
    try {
        const result = await service.observeRegisteredFile(
            req.params.fileName
        );

        return res.json({
            success: true,
            sourceDocumentKey: result.sourceDocumentKey,
            fileName: result.fileName,
            observedUpdatedAt: result.lastObservedUpdatedAt,
            observedSize: result.lastObservedSize
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "ファイルの観測に失敗しました"
        });
    }
});

app.post("/files/:fileName/analyze", async (req, res) => {
    try {
        const fileName = req.params.fileName;
        const extension = path.extname(fileName).toLowerCase();

        let result;

        if (extension === ".docx" || extension === ".doc") {
            result =
                await service.normalizeRegisteredWord(fileName);
        } else if (extension === ".xlsx" || extension === ".xls") {
            result =
                await service.normalizeRegisteredExcel(fileName);
        } else {
            return res.status(400).json({
                success: false,
                message: "WordまたはExcelファイルのみ解析できます"
            });
        }

        return res.json({
            success: true,
            fileName,
            documentType: result.documentType,
            documentTypeConfidence:
                result.documentTypeConfidence,
            source: result.source,
            extracted: result.extracted
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "ファイルの解析に失敗しました"
        });
    }
});

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: '指定されたLocal Connector APIが見つかりません'
    });
});

if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(
            `RISEN CARE Local Connector 起動 http://${HOST}:${PORT}`
        );
    });
}

module.exports = app;
