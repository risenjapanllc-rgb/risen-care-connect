const express = require('express');
const path = require('path');
const LocalConnectorCompositionRoot = require('./LocalConnectorCompositionRoot');

const app = express();
const service = LocalConnectorCompositionRoot.createService();

const HOST = '127.0.0.1';
const PORT = Number(
    process.env.RISEN_LOCAL_CONNECTOR_PORT || 4310
);

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
