const express = require('express');
const cors = require('cors');
const path = require('path');
const LocalConnectorCompositionRoot = require('./LocalConnectorCompositionRoot');

const app = express();
app.disable('x-powered-by');
const service = LocalConnectorCompositionRoot.createService();
app.locals.localConnectorService = service;

let localConnectorIngestionServicePromise = null;
let sourceDocumentIngestionServicePromise = null;

app.locals.getSourceDocumentIngestionService =
    async () => {
        if (!sourceDocumentIngestionServicePromise) {
            sourceDocumentIngestionServicePromise =
                LocalConnectorCompositionRoot
                    .createSourceDocumentIngestionService({
                        endpoint:
                            process.env
                                .RISEN_SOURCE_DOCUMENT_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_DOCUMENT_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT,
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            'RISEN-Connector',
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            'x-risen-connector-id'
                    })
                    .catch(error => {
                        sourceDocumentIngestionServicePromise =
                            null;

                        throw error;
                    });
        }

        return await sourceDocumentIngestionServicePromise;
    };

app.locals.getLocalConnectorIngestionService =
    async () => {
        if (!localConnectorIngestionServicePromise) {
            localConnectorIngestionServicePromise =
                LocalConnectorCompositionRoot
                    .createIngestionService({
                        endpoint:
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT,
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            'RISEN-Connector',
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            'x-risen-connector-id'
                    })
                    .catch(error => {
                        localConnectorIngestionServicePromise =
                            null;

                        throw error;
                    });
        }

        return await localConnectorIngestionServicePromise;
    };

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

app.get('/identity', async (req, res) => {
    try {
        const connectorId =
            await service.getConnectorId();

        return res.json({
            success: true,
            connectorId
        });
    } catch (error) {
        console.error(
            'Local Connector ID取得エラー:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Local Connector IDの取得に失敗しました'
        });
    }
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
                relativePath: file.relativePath,
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

        if (extension === ".docx") {
            result =
                await service.normalizeRegisteredWord(fileName);
        } else if (extension === ".xlsx" || extension === ".xls") {
            result =
                await service.normalizeRegisteredExcel(fileName);
        } else if (extension === ".csv") {
            result =
                await service.normalizeRegisteredCsv(fileName);
        } else {
            return res.status(400).json({
                success: false,
                message: "Word、Excel、CSVファイルのみ解析できます"
            });
        }

        return res.json({
            success: true,
            fileName,
            sourceType: result.sourceType,
            documentType: result.documentType,
            documentTypeConfidence:
                result.documentTypeConfidence,
            source: result.source,
            content: result.content,
            extracted: result.extracted
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "ファイルの解析に失敗しました"
        });
    }
});

app.post(
    "/files/:fileName/source-document",
    async (req, res) => {
        try {
            const ingestionService =
                await app.locals
                    .getSourceDocumentIngestionService();

            const result =
                await ingestionService
                    .ingestRegisteredFile(
                        req.params.fileName
                    );

            if (
                result?.status === "created" ||
                result?.status === "updated" ||
                result?.status === "unchanged"
            ) {
                return res.status(200).json({
                    success: true,
                    status:
                        result.status
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "Server Trust Boundaryから不正な応答を受信しました"
            });
        } catch (error) {
            if (
                error?.code ===
                "connector_trust_denied"
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Connector認証に失敗しました"
                });
            }

            if (
                error?.code ===
                "connector_payload_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "原本ファイルの送信内容が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "原本ファイルの保存に失敗しました"
            });
        }
    }
);

app.post("/files/:fileName/ingest", async (req, res) => {
    try {
        const ingestionService =
            await app.locals
                .getLocalConnectorIngestionService();

        const result =
            await ingestionService
                .ingestRegisteredFile(
                    req.params.fileName
                );

        if (
            result?.status === "matched" ||
            result?.status === "needs_review" ||
            result?.status === "unmatched"
        ) {
            return res.status(200).json({
                success: true,
                requestId:
                    result.requestId,
                status:
                    result.status
            });
        }

        return res.status(503).json({
            success: false,
            message:
                "Server Trust Boundaryから不正な応答を受信しました"
        });
    } catch (error) {
        const safeRemoteErrors = {
            connector_trust_denied: {
                httpStatus: 401,
                status: "denied"
            },
            connector_payload_invalid: {
                httpStatus: 422,
                status: "invalid"
            },
            connector_processing_unavailable: {
                httpStatus: 503,
                status: "error"
            }
        };

        const mapping =
            error &&
            typeof error === "object"
                ? safeRemoteErrors[error.code]
                : null;

        const hasSafeRequestId =
            error &&
            typeof error.requestId === "string" &&
            error.requestId.trim() !== "";

        if (
            mapping &&
            error.httpStatus === mapping.httpStatus &&
            hasSafeRequestId
        ) {
            return res
                .status(mapping.httpStatus)
                .json({
                    success: false,
                    requestId:
                        error.requestId.trim(),
                    status:
                        mapping.status,
                    errorCode:
                        error.code
                });
        }

        return res.status(503).json({
            success: false,
            message:
                "Server Trust Boundaryへの送信に失敗しました"
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
