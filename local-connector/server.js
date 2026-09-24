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
let sourceFieldMappingIngestionServicePromise = null;
let sourceFieldInterpretationIngestionServicePromise = null;
let residentCandidateServicePromise = null;
let sourceResidentLinkClientPromise = null;
let sourceResidentMappingClientPromise = null;
let sourceRecordIdentityMappingServicePromise = null;
let sourceRecordIdentityCandidateServicePromise = null;
let confirmedDocumentTypeServicePromise = null;
let residentAdmissionDecisionServicePromise = null;
let recipientCertificateImportPreviewServicePromise = null;
let residentCreationClientPromise = null;

const CONFIRMED_DOCUMENT_TYPES = Object.freeze([
    "support_record",
    "individual_support_plan",
    "assessment",
    "monitoring",
    "recipient_certificate",
    "resident_master",
    "other"
]);

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
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-documents";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
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
                            'x-risen-connector-id',
                        timeoutMs: 60000
                    })
                    .catch(error => {
                        sourceDocumentIngestionServicePromise =
                            null;

                        throw error;
                    });
        }

        return await sourceDocumentIngestionServicePromise;
    };

let importPreviewServicePromise = null;

app.locals.getImportPreviewService =
    async () => {
        if (!importPreviewServicePromise) {
            const semanticEndpoint =
                process.env
                    .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

            const buildEndpoint =
                pathname => {
                    if (!semanticEndpoint) {
                        return undefined;
                    }

                    const url =
                        new URL(
                            semanticEndpoint
                        );

                    url.pathname =
                        pathname;
                    url.search = "";
                    url.hash = "";

                    return url.toString();
                };

            importPreviewServicePromise =
                LocalConnectorCompositionRoot
                    .createImportPreviewService({
                        fieldMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            buildEndpoint(
                                "/connector/source-field-mappings"
                            ),
                        residentMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            buildEndpoint(
                                "/connector/source-resident-mappings"
                            ),
                        sourceRecordIdentityMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_RECORD_IDENTITY_MAPPING_ENDPOINT ||
                            buildEndpoint(
                                "/connector/source-record-identity-mapping"
                            ),
                        semanticRecordPreviewEndpoint:
                            process.env
                                .RISEN_SEMANTIC_RECORD_PREVIEW_ENDPOINT ||
                            buildEndpoint(
                                "/connector/semantic-record-preview"
                            ),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        importPreviewServicePromise =
                            null;

                        throw error;
                    });
        }

        return await importPreviewServicePromise;
    };

let importExecutionServicePromise = null;

app.locals.getImportExecutionService =
    async () => {
        if (!importExecutionServicePromise) {
            const semanticEndpoint =
                process.env
                    .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

            const buildEndpoint =
                pathname => {
                    if (!semanticEndpoint) {
                        return undefined;
                    }

                    const url =
                        new URL(
                            semanticEndpoint
                        );

                    url.pathname =
                        pathname;
                    url.search = "";
                    url.hash = "";

                    return url.toString();
                };

            importExecutionServicePromise =
                LocalConnectorCompositionRoot
                    .createImportExecutionService({
                        fieldMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            buildEndpoint(
                                "/connector/source-field-mappings"
                            ),
                        residentMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            buildEndpoint(
                                "/connector/source-resident-mappings"
                            ),
                        sourceRecordIdentityMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_RECORD_IDENTITY_MAPPING_ENDPOINT ||
                            buildEndpoint(
                                "/connector/source-record-identity-mapping"
                            ),
                        semanticRecordPreviewEndpoint:
                            process.env
                                .RISEN_SEMANTIC_RECORD_PREVIEW_ENDPOINT ||
                            buildEndpoint(
                                "/connector/semantic-record-preview"
                            ),
                        supportRecordBatchWriteEndpoint:
                            process.env
                                .RISEN_SUPPORT_RECORD_BATCH_WRITE_ENDPOINT ||
                            buildEndpoint(
                                "/connector/support-record-batch-write"
                            ),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        importExecutionServicePromise =
                            null;

                        throw error;
                    });
        }

        return await importExecutionServicePromise;
    };

let recipientCertificateImportExecutionServicePromise = null;

app.locals.getRecipientCertificateImportExecutionService =
    async () => {
        if (!recipientCertificateImportExecutionServicePromise) {
            const semanticEndpoint =
                process.env
                    .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

            const endpointFor =
                pathname => {
                    if (!semanticEndpoint) {
                        return undefined;
                    }

                    const url =
                        new URL(
                            semanticEndpoint
                        );

                    url.pathname = pathname;
                    url.search = "";
                    url.hash = "";

                    return url.toString();
                };

            recipientCertificateImportExecutionServicePromise =
                LocalConnectorCompositionRoot
                    .createRecipientCertificateImportExecutionService({
                        fieldMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            endpointFor(
                                "/connector/source-field-mappings"
                            ),
                        interpretationEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            endpointFor(
                                "/connector/source-field-interpretations"
                            ),
                        candidateEndpoint:
                            process.env
                                .RISEN_RESIDENT_CANDIDATE_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_RESIDENT_CANDIDATE_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-candidates"
                            ),
                        residentMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            endpointFor(
                                "/connector/source-resident-mappings"
                            ),
                        admissionDecisionEndpoint:
                            process.env
                                .RISEN_RESIDENT_ADMISSION_DECISION_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-admission-decisions"
                            ),
                        semanticLogicalRecordEndpoint:
                            process.env
                                .RISEN_SEMANTIC_LOGICAL_RECORD_ENDPOINT ||
                            endpointFor(
                                "/connector/semantic-logical-record"
                            ),
                        residentProfileQueryEndpoint:
                            process.env
                                .RISEN_RESIDENT_PROFILE_QUERY_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-profile-query"
                            ),
                        residentProfileEndpoint:
                            process.env
                                .RISEN_RESIDENT_PROFILE_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-profile"
                            ),
                        residentAdmissionEndpoint:
                            process.env
                                .RISEN_RESIDENT_ADMISSION_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-admission"
                            ),
                        semanticLogicalRecordPersistenceEndpoint:
                            process.env
                                .RISEN_SEMANTIC_LOGICAL_RECORD_PERSISTENCE_ENDPOINT ||
                            endpointFor(
                                "/connector/semantic-logical-record-persistence"
                            ),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        recipientCertificateImportExecutionServicePromise =
                            null;

                        throw error;
                    });
        }

        return await recipientCertificateImportExecutionServicePromise;
    };

app.locals.getSourceFieldMappingIngestionService =
    async () => {
        if (!sourceFieldMappingIngestionServicePromise) {
            sourceFieldMappingIngestionServicePromise =
                LocalConnectorCompositionRoot
                    .createSourceFieldMappingIngestionService({
                        endpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-field-mappings";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
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
                            'x-risen-connector-id',
                        timeoutMs: 60000
                    })
                    .catch(error => {
                        sourceFieldMappingIngestionServicePromise =
                            null;

                        throw error;
                    });
        }

        return await sourceFieldMappingIngestionServicePromise;
    };

app.locals.getSourceFieldInterpretationIngestionService =
    async () => {
        if (!sourceFieldInterpretationIngestionServicePromise) {
            sourceFieldInterpretationIngestionServicePromise =
                LocalConnectorCompositionRoot
                    .createSourceFieldInterpretationIngestionService({
                        endpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-field-interpretations";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
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
                        sourceFieldInterpretationIngestionServicePromise =
                            null;

                        throw error;
                    });
        }

        return await sourceFieldInterpretationIngestionServicePromise;
    };

app.locals.getResidentCandidateService =
    async () => {
        if (!residentCandidateServicePromise) {
            residentCandidateServicePromise =
                LocalConnectorCompositionRoot
                    .createSourceResidentCandidateResolver({
                        mappingEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-field-mappings";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        interpretationEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-field-interpretations";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        candidateEndpoint:
                            process.env
                                .RISEN_RESIDENT_CANDIDATE_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_RESIDENT_CANDIDATE_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/resident-candidates";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
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
                        residentCandidateServicePromise =
                            null;

                        throw error;
                    });
        }

        return await residentCandidateServicePromise;
    };

app.locals.getSourceResidentLinkClient =
    async () => {
        if (!sourceResidentLinkClientPromise) {
            sourceResidentLinkClientPromise =
                LocalConnectorCompositionRoot
                    .createSourceResidentLinkClient({
                        endpoint:
                            process.env
                                .RISEN_SOURCE_RESIDENT_LINK_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_RESIDENT_LINK_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-resident-links";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        sourceResidentLinkClientPromise =
                            null;

                        throw error;
                    });
        }

        return await sourceResidentLinkClientPromise;
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

        const observation =
            await service.observeRegisteredFile(fileName);

        return res.json({
            success: true,
            fileName,
            sourceDocumentKey:
                observation.sourceDocumentKey,
            sourceUpdatedAt:
                observation.lastObservedUpdatedAt,
            sourceSize:
                observation.lastObservedSize,
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

            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const hasExpectedSnapshot =
                Object.prototype.hasOwnProperty.call(
                    input,
                    "sourceDocumentKey"
                ) ||
                Object.prototype.hasOwnProperty.call(
                    input,
                    "sourceUpdatedAt"
                ) ||
                Object.prototype.hasOwnProperty.call(
                    input,
                    "sourceSize"
                );

            const expectedSnapshot =
                hasExpectedSnapshot
                    ? {
                        sourceDocumentKey:
                            input.sourceDocumentKey,
                        sourceUpdatedAt:
                            input.sourceUpdatedAt,
                        sourceSize:
                            input.sourceSize
                    }
                    : null;

            const result =
                expectedSnapshot === null
                    ? await ingestionService
                        .ingestRegisteredFile(
                            req.params.fileName
                        )
                    : await ingestionService
                        .ingestRegisteredFile(
                            req.params.fileName,
                            expectedSnapshot
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

            if (
                error?.code ===
                "payload_too_large"
            ) {
                return res.status(413).json({
                    success: false,
                    message:
                        "原本ファイルのサイズが上限を超えています"
                });
            }

            if (
                error?.code ===
                "source_snapshot_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "原本ファイルの確認情報が不正です"
                });
            }

            if (
                error?.code ===
                "source_snapshot_changed"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "原本ファイルが更新されています。もう一度解析してください"
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

app.get(
    "/source-field-mappings",
    async (req, res) => {
        try {
            const queryKeys =
                Object.keys(req.query || {});

            const allowedQueryKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";

            const rawSourceSize =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";

            const sourceSize =
                /^\d+$/.test(rawSourceSize)
                    ? Number(rawSourceSize)
                    : Number.NaN;

            if (
                queryKeys.length !== 3 ||
                queryKeys.some(
                    key => !allowedQueryKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "項目対応の取得条件が不正です"
                });
            }

            const queryService =
                await app.locals
                    .getSourceFieldMappingIngestionService();

            const result =
                await queryService.list(
                    sourceDocumentKey,
                    new Date(sourceUpdatedAt)
                        .toISOString(),
                    sourceSize
                );

            if (
                result?.status === "found" &&
                Array.isArray(result.mappings)
            ) {
                return res.status(200).json({
                    success: true,
                    mappings:
                        result.mappings
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
                "source_field_mapping_query_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "項目対応の取得条件が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "項目対応の取得に失敗しました"
            });
        }
    }
);

app.post(
    "/source-field-mappings",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const mapping =
                input.sourceFieldMapping &&
                typeof input.sourceFieldMapping === "object" &&
                !Array.isArray(input.sourceFieldMapping)
                    ? input.sourceFieldMapping
                    : null;

            if (!mapping) {
                return res.status(422).json({
                    success: false,
                    message:
                        "項目対応の送信内容が不正です"
                });
            }

            const sourceFieldMapping = {
                sourceDocumentKey:
                    mapping.sourceDocumentKey,
                sourceFieldKey:
                    mapping.sourceFieldKey,
                standardEntityName:
                    mapping.standardEntityName,
                standardFieldName:
                    mapping.standardFieldName,
                sheetName:
                    mapping.sheetName ?? null,
                headerLabel:
                    mapping.headerLabel ?? null,
                sourceUpdatedAt:
                    mapping.sourceUpdatedAt,
                sourceSize:
                    mapping.sourceSize
            };

            const ingestionService =
                await app.locals
                    .getSourceFieldMappingIngestionService();

            const result =
                await ingestionService.ingest(
                    sourceFieldMapping
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
                "source_field_mapping_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "項目対応の送信内容が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "項目対応の保存に失敗しました"
            });
        }
    }
);

app.get(
    "/source-field-interpretations",
    async (req, res) => {
        try {
            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";

            const sourceSizeText =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";

            const sourceSize =
                /^\d+$/.test(sourceSizeText)
                    ? Number(sourceSizeText)
                    : Number.NaN;

            if (
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "現在の原本ファイル状態を確認できません"
                });
            }

            const queryService =
                await app.locals
                    .getSourceFieldInterpretationIngestionService();

            const result =
                await queryService.list({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(
                            sourceUpdatedAt
                        ).toISOString(),
                    sourceSize
                });

            if (
                result?.status === "found" &&
                Array.isArray(
                    result.interpretations
                )
            ) {
                return res.status(200).json({
                    success: true,
                    status: "found",
                    interpretations:
                        result.interpretations
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
                "source_field_interpretation_query_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "項目確認状態の取得条件が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "項目確認状態の取得に失敗しました"
            });
        }
    }
);

app.post(
    "/source-field-interpretations",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const interpretation =
                input.sourceFieldInterpretation &&
                typeof input.sourceFieldInterpretation === "object" &&
                !Array.isArray(input.sourceFieldInterpretation)
                    ? input.sourceFieldInterpretation
                    : null;

            if (!interpretation) {
                return res.status(422).json({
                    success: false,
                    message:
                        "項目確認状態の送信内容が不正です"
                });
            }

            const sourceFieldInterpretation = {
                sourceDocumentKey:
                    interpretation.sourceDocumentKey,
                sourceUpdatedAt:
                    interpretation.sourceUpdatedAt,
                sourceSize:
                    interpretation.sourceSize,
                sourceFieldKey:
                    interpretation.sourceFieldKey,
                interpretationStatus:
                    interpretation.interpretationStatus,
                mappingStatus:
                    interpretation.mappingStatus,
                confirmedMeaning:
                    interpretation.confirmedMeaning ?? null,
                confirmedByHuman: true
            };

            if (
                typeof sourceFieldInterpretation.sourceDocumentKey !== "string" ||
                !sourceFieldInterpretation.sourceDocumentKey.trim() ||
                typeof sourceFieldInterpretation.sourceUpdatedAt !== "string" ||
                !sourceFieldInterpretation.sourceUpdatedAt.trim() ||
                Number.isNaN(
                    Date.parse(
                        sourceFieldInterpretation.sourceUpdatedAt
                    )
                ) ||
                !Number.isSafeInteger(
                    sourceFieldInterpretation.sourceSize
                ) ||
                sourceFieldInterpretation.sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "現在の原本ファイル状態を確認できません"
                });
            }

            sourceFieldInterpretation.sourceUpdatedAt =
                new Date(
                    sourceFieldInterpretation.sourceUpdatedAt
                ).toISOString();

            const ingestionService =
                await app.locals
                    .getSourceFieldInterpretationIngestionService();

            const result =
                await ingestionService.ingest(
                    sourceFieldInterpretation
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
                "source_field_interpretation_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "項目確認状態の送信内容が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "項目確認状態の保存に失敗しました"
            });
        }
    }
);

app.locals.getSourceResidentMappingClient =
    async () => {
        if (!sourceResidentMappingClientPromise) {
            sourceResidentMappingClientPromise =
                LocalConnectorCompositionRoot
                    .createSourceResidentMappingClient({
                        endpoint:
                            process.env
                                .RISEN_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-resident-mappings";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        sourceResidentMappingClientPromise =
                            null;

                        throw error;
                    });
        }

        return await sourceResidentMappingClientPromise;
    };

app.locals.getSourceRecordIdentityCandidateService =
    async () => {
        if (!sourceRecordIdentityCandidateServicePromise) {
            sourceRecordIdentityCandidateServicePromise =
                Promise.resolve(
                    LocalConnectorCompositionRoot
                        .createSourceRecordIdentityCandidateService()
                ).catch(error => {
                    sourceRecordIdentityCandidateServicePromise =
                        null;
                    throw error;
                });
        }

        return await sourceRecordIdentityCandidateServicePromise;
    };

app.locals.getSourceRecordIdentityMappingService =
    async () => {
        if (!sourceRecordIdentityMappingServicePromise) {
            sourceRecordIdentityMappingServicePromise =
                LocalConnectorCompositionRoot
                    .createSourceRecordIdentityMappingService({
                        endpoint:
                            process.env
                                .RISEN_SOURCE_RECORD_IDENTITY_MAPPING_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/source-record-identity-mapping";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        sourceRecordIdentityMappingServicePromise =
                            null;

                        throw error;
                    });
        }

        return await sourceRecordIdentityMappingServicePromise;
    };

app.locals.getConfirmedDocumentTypeService =
    async () => {
        if (!confirmedDocumentTypeServicePromise) {
            confirmedDocumentTypeServicePromise =
                LocalConnectorCompositionRoot
                    .createConfirmedDocumentTypeService({
                        endpoint:
                            process.env
                                .RISEN_CONFIRMED_DOCUMENT_TYPE_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/confirmed-document-type";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id",
                        allowedDocumentTypes:
                            CONFIRMED_DOCUMENT_TYPES
                    })
                    .catch(error => {
                        confirmedDocumentTypeServicePromise =
                            null;
                        throw error;
                    });
        }

        return await confirmedDocumentTypeServicePromise;
    };

app.locals.getRecipientCertificateImportPreviewService =
    async () => {
        if (!recipientCertificateImportPreviewServicePromise) {
            const semanticEndpoint =
                process.env
                    .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

            const endpointFor = pathname => {
                if (!semanticEndpoint) {
                    return undefined;
                }

                const url =
                    new URL(semanticEndpoint);

                url.pathname = pathname;
                url.search = "";
                url.hash = "";

                return url.toString();
            };

            recipientCertificateImportPreviewServicePromise =
                LocalConnectorCompositionRoot
                    .createRecipientCertificateImportPreviewService({
                        fieldMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_MAPPING_ENDPOINT ||
                            endpointFor(
                                "/connector/source-field-mappings"
                            ),
                        interpretationEndpoint:
                            process.env
                                .RISEN_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_INTERPRETATION_ENDPOINT ||
                            endpointFor(
                                "/connector/source-field-interpretations"
                            ),
                        candidateEndpoint:
                            process.env
                                .RISEN_RESIDENT_CANDIDATE_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_RESIDENT_CANDIDATE_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-candidates"
                            ),
                        residentMappingEndpoint:
                            process.env
                                .RISEN_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_SOURCE_RESIDENT_MAPPING_ENDPOINT ||
                            endpointFor(
                                "/connector/source-resident-mappings"
                            ),
                        admissionDecisionEndpoint:
                            process.env
                                .RISEN_RESIDENT_ADMISSION_DECISION_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-admission-decisions"
                            ),
                        semanticLogicalRecordEndpoint:
                            process.env
                                .RISEN_SEMANTIC_LOGICAL_RECORD_ENDPOINT ||
                            endpointFor(
                                "/connector/semantic-logical-record"
                            ),
                        residentProfileQueryEndpoint:
                            process.env
                                .RISEN_RESIDENT_PROFILE_QUERY_ENDPOINT ||
                            endpointFor(
                                "/connector/resident-profile-query"
                            ),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        recipientCertificateImportPreviewServicePromise =
                            null;
                        throw error;
                    });
        }

        return await recipientCertificateImportPreviewServicePromise;
    };

app.locals.getResidentAdmissionDecisionService =
    async () => {
        if (!residentAdmissionDecisionServicePromise) {
            residentAdmissionDecisionServicePromise =
                LocalConnectorCompositionRoot
                    .createResidentAdmissionDecisionService({
                        endpoint:
                            process.env
                                .RISEN_RESIDENT_ADMISSION_DECISION_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/resident-admission-decisions";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        residentAdmissionDecisionServicePromise =
                            null;
                        throw error;
                    });
        }

        return await residentAdmissionDecisionServicePromise;
    };

app.locals.getResidentCreationClient =
    async () => {
        if (!residentCreationClientPromise) {
            residentCreationClientPromise =
                LocalConnectorCompositionRoot
                    .createResidentCreationClient({
                        endpoint:
                            process.env
                                .RISEN_RESIDENT_CREATION_ENDPOINT ||
                            process.env
                                .RISEN_SERVER_TRUST_BOUNDARY_RESIDENT_CREATION_ENDPOINT ||
                            (() => {
                                const semanticEndpoint =
                                    process.env
                                        .RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT;

                                if (!semanticEndpoint) {
                                    return undefined;
                                }

                                const url =
                                    new URL(
                                        semanticEndpoint
                                    );

                                url.pathname =
                                    "/connector/residents";
                                url.search = "";
                                url.hash = "";

                                return url.toString();
                            })(),
                        credential:
                            process.env
                                .CONNECTOR_CREDENTIAL,
                        authorizationScheme:
                            process.env
                                .RISEN_CONNECTOR_AUTHORIZATION_SCHEME ||
                            "RISEN-Connector",
                        connectorIdHeader:
                            process.env
                                .RISEN_CONNECTOR_ID_HEADER ||
                            "x-risen-connector-id"
                    })
                    .catch(error => {
                        residentCreationClientPromise =
                            null;

                        throw error;
                    });
        }

        return await residentCreationClientPromise;
    };

app.post(
    "/residents",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);

            const name =
                typeof input.name === "string"
                    ? input.name.trim()
                    : "";

            if (
                inputKeys.length !== 1 ||
                inputKeys[0] !== "name" ||
                !name
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者登録の送信内容が不正です"
                });
            }

            const client =
                await app.locals
                    .getResidentCreationClient();

            const result =
                await client.create({
                    name
                });

            if (
                (
                    result?.status === "created" ||
                    result?.status === "existing"
                ) &&
                result.resident &&
                typeof result.resident.residentId === "string" &&
                result.resident.residentId.trim() &&
                typeof result.resident.name === "string" &&
                result.resident.name.trim()
            ) {
                return res.status(200).json({
                    success: true,
                    status:
                        result.status,
                    resident:
                        result.resident
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
                return res.status(403).json({
                    success: false,
                    message:
                        "利用者登録が拒否されました"
                });
            }

            if (
                error instanceof TypeError ||
                error?.code ===
                    "resident_creation_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者登録の送信内容が不正です"
                });
            }

            if (
                error?.code ===
                    "resident_name_ambiguous"
            ) {
                return res.status(409).json({
                    success: false,
                    errorCode:
                        "resident_name_ambiguous",
                    message:
                        "同名の利用者が複数存在するため登録できません"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者登録に失敗しました"
            });
        }
    }
);

app.get(
    "/source-resident-mappings",
    async (req, res) => {
        try {
            const queryKeys =
                Object.keys(req.query || {});

            const allowedQueryKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";

            const rawSourceSize =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";

            const sourceSize =
                /^\d+$/.test(rawSourceSize)
                    ? Number(rawSourceSize)
                    : Number.NaN;

            if (
                queryKeys.length !== 3 ||
                queryKeys.some(
                    key => !allowedQueryKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者マッピングの取得条件が不正です"
                });
            }

            const client =
                await app.locals
                    .getSourceResidentMappingClient();

            const result =
                await client.list({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize
                });

            if (
                result?.status === "found" &&
                Array.isArray(result.mappings)
            ) {
                return res.status(200).json({
                    success: true,
                    status: "found",
                    mappings:
                        result.mappings
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "Server Trust Boundaryから不正な応答を受信しました"
            });
        } catch (error) {
            if (
                error?.code === "server_trust_boundary_denied"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "利用者マッピングの取得が拒否されました"
                });
            }

            if (
                error instanceof TypeError ||
                error?.code ===
                    "server_trust_boundary_invalid_request"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者マッピングの取得条件が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者マッピングの取得に失敗しました"
            });
        }
    }
);

app.post(
    "/source-resident-mappings",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);

            const allowedInputKeys =
                new Set([
                    "sourceDocumentKey",
                    "identifierType",
                    "identifierDigest",
                    "mappingStatus",
                    "residentId",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";

            const identifierType =
                typeof input.identifierType === "string"
                    ? input.identifierType.trim()
                    : "";

            const identifierDigest =
                typeof input.identifierDigest === "string"
                    ? input.identifierDigest.trim()
                    : "";

            const mappingStatus =
                typeof input.mappingStatus === "string"
                    ? input.mappingStatus.trim()
                    : "";

            const residentId =
                typeof input.residentId === "string"
                    ? input.residentId.trim()
                    : input.residentId;

            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";

            const sourceSize =
                input.sourceSize;

            if (
                inputKeys.length !== 7 ||
                inputKeys.some(
                    key => !allowedInputKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !["user_code", "name"].includes(
                    identifierType
                ) ||
                !/^[0-9a-f]{64}$/.test(
                    identifierDigest
                ) ||
                ![
                    "confirmed",
                    "deferred",
                    "no_match"
                ].includes(mappingStatus) ||
                (
                    mappingStatus === "confirmed" &&
                    (
                        typeof residentId !== "string" ||
                        !residentId
                    )
                ) ||
                (
                    mappingStatus !== "confirmed" &&
                    residentId != null
                ) ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者マッピングの送信内容が不正です"
                });
            }

            const client =
                await app.locals
                    .getSourceResidentMappingClient();

            const result =
                await client.save({
                    sourceDocumentKey,
                    identifierType,
                    identifierDigest,
                    mappingStatus,
                    residentId:
                        mappingStatus === "confirmed"
                            ? residentId
                            : null,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize
                });

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
                error?.code === "server_trust_boundary_denied"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "利用者マッピングの保存が拒否されました"
                });
            }

            if (
                error instanceof TypeError ||
                error?.code ===
                    "server_trust_boundary_invalid_request"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者マッピングの送信内容が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者マッピングの保存に失敗しました"
            });
        }
    }
);

app.get(
    "/source-record-identity-candidates",
    async (req, res) => {
        try {
            const queryKeys = Object.keys(req.query || {});
            const allowedQueryKeys = new Set([
                "sourceDocumentKey",
                "sourceUpdatedAt",
                "sourceSize"
            ]);

            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";
            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";
            const rawSourceSize =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";
            const sourceSize =
                /^\d+$/.test(rawSourceSize)
                    ? Number(rawSourceSize)
                    : Number.NaN;

            if (
                queryKeys.length !== 3 ||
                queryKeys.some(key => !allowedQueryKeys.has(key)) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(Date.parse(sourceUpdatedAt)) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "識別候補の取得条件が不正です"
                });
            }

            const candidateService =
                await app.locals
                    .getSourceRecordIdentityCandidateService();

            const result =
                await candidateService.findCandidates({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt).toISOString(),
                    sourceSize
                });

            return res.status(200).json({
                success: true,
                status: result.status,
                candidates:
                    Array.isArray(result.candidates)
                        ? result.candidates
                        : []
            });
        } catch (error) {
            if (
                error?.code === "source_snapshot_changed" ||
                error?.code === "source_snapshot_unsupported" ||
                error?.code === "source_entities_unavailable"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "原本の状態を再確認してください"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "識別候補の確認に失敗しました"
            });
        }
    }
);


app.get(
    "/confirmed-document-type",
    async (req, res) => {
        try {
            const queryKeys =
                Object.keys(req.query || {});
            const allowedQueryKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";
            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";
            const rawSourceSize =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";
            const sourceSize =
                /^\d+$/.test(rawSourceSize)
                    ? Number(rawSourceSize)
                    : Number.NaN;

            if (
                queryKeys.length !== 3 ||
                queryKeys.some(
                    key => !allowedQueryKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(Date.parse(sourceUpdatedAt)) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "データ種別の取得条件が不正です"
                });
            }

            const confirmedDocumentTypeService =
                await app.locals
                    .getConfirmedDocumentTypeService();

            const result =
                await confirmedDocumentTypeService.get({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize
                });

            if (result?.status === "not_found") {
                return res.status(200).json({
                    success: true,
                    status: "not_found",
                    confirmation: null
                });
            }

            if (
                result?.status === "found" &&
                result.confirmation &&
                typeof result.confirmation.documentType ===
                    "string" &&
                result.confirmation.documentType.trim()
            ) {
                return res.status(200).json({
                    success: true,
                    status: "found",
                    confirmation:
                        result.confirmation
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

            if (error instanceof TypeError) {
                return res.status(422).json({
                    success: false,
                    message:
                        "データ種別の取得条件が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "データ種別の取得に失敗しました"
            });
        }
    }
);

app.post(
    "/confirmed-document-type",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);
            const allowedInputKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize",
                    "documentType"
                ]);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";
            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";
            const sourceSize =
                input.sourceSize;
            const documentType =
                typeof input.documentType === "string"
                    ? input.documentType.trim()
                    : "";

            if (
                inputKeys.length !== 4 ||
                inputKeys.some(
                    key => !allowedInputKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(Date.parse(sourceUpdatedAt)) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0 ||
                !documentType
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "データ種別の確認内容が不正です"
                });
            }

            const confirmedDocumentTypeService =
                await app.locals
                    .getConfirmedDocumentTypeService();

            const result =
                await confirmedDocumentTypeService.confirm({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize,
                    documentType
                });

            if (
                result?.status ===
                    "invalid_document_type"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "対応していないデータ種別です"
                });
            }

            if (
                result?.status === "confirmed" &&
                result.documentType === documentType &&
                ["created", "updated", "unchanged"]
                    .includes(result.persistenceStatus)
            ) {
                return res.status(200).json({
                    success: true,
                    status: "confirmed",
                    documentType:
                        result.documentType,
                    persistenceStatus:
                        result.persistenceStatus
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
                error instanceof TypeError ||
                error?.code ===
                    "source_snapshot_changed" ||
                error?.code ===
                    "source_document_not_found"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "原本の状態が変わっています。再解析してください"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "データ種別の確認に失敗しました"
            });
        }
    }
);

app.get(
    "/resident-admission-decisions",
    async (req, res) => {
        try {
            const queryKeys =
                Object.keys(req.query || {});
            const allowedQueryKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize",
                    "identifierType",
                    "identifierDigest"
                ]);

            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";
            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";
            const rawSourceSize =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";
            const sourceSize =
                /^\d+$/.test(rawSourceSize)
                    ? Number(rawSourceSize)
                    : Number.NaN;
            const identifierType =
                typeof req.query?.identifierType === "string"
                    ? req.query.identifierType.trim()
                    : "";
            const identifierDigest =
                typeof req.query?.identifierDigest === "string"
                    ? req.query.identifierDigest.trim()
                    : "";

            if (
                queryKeys.length !== 5 ||
                queryKeys.some(
                    key => !allowedQueryKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(Date.parse(sourceUpdatedAt)) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0 ||
                !identifierType ||
                !identifierDigest
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者登録判断の取得条件が不正です"
                });
            }

            const service =
                await app.locals
                    .getResidentAdmissionDecisionService();

            const result =
                await service.get({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize,
                    identifierType,
                    identifierDigest
                });

            if (result?.status === "not_found") {
                return res.status(200).json({
                    success: true,
                    status: "not_found",
                    decision: null
                });
            }

            if (
                result?.status === "found" &&
                result.decision &&
                [
                    "approved_new",
                    "rejected",
                    "deferred"
                ].includes(result.decision.decision)
            ) {
                return res.status(200).json({
                    success: true,
                    status: "found",
                    decision: {
                        decision:
                            result.decision.decision,
                        reviewedAt:
                            result.decision.reviewedAt
                    }
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
                error instanceof TypeError ||
                error?.code ===
                    "source_snapshot_changed" ||
                error?.code ===
                    "source_document_not_found"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "原本の状態が変わっています。再解析してください"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者登録判断の取得に失敗しました"
            });
        }
    }
);

app.post(
    "/resident-admission-decisions",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);
            const allowedInputKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize",
                    "identifierType",
                    "identifierDigest",
                    "decision"
                ]);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";
            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";
            const sourceSize =
                input.sourceSize;
            const identifierType =
                typeof input.identifierType === "string"
                    ? input.identifierType.trim()
                    : "";
            const identifierDigest =
                typeof input.identifierDigest === "string"
                    ? input.identifierDigest.trim()
                    : "";
            const decision =
                typeof input.decision === "string"
                    ? input.decision.trim()
                    : "";

            if (
                inputKeys.length !== 6 ||
                inputKeys.some(
                    key => !allowedInputKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(Date.parse(sourceUpdatedAt)) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0 ||
                !identifierType ||
                !identifierDigest ||
                ![
                    "approved_new",
                    "rejected",
                    "deferred"
                ].includes(decision)
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者登録判断の内容が不正です"
                });
            }

            const service =
                await app.locals
                    .getResidentAdmissionDecisionService();

            const result =
                await service.decide({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize,
                    identifierType,
                    identifierDigest,
                    decision
                });

            if (
                result?.status === "decided" &&
                result.decision === decision &&
                ["created", "updated", "unchanged"]
                    .includes(result.persistenceStatus)
            ) {
                return res.status(200).json({
                    success: true,
                    status: "decided",
                    decision:
                        result.decision,
                    persistenceStatus:
                        result.persistenceStatus
                });
            }

            if (
                result?.status ===
                    "invalid_decision"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者登録判断の内容が不正です"
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
                error instanceof TypeError
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者登録判断の内容が不正です"
                });
            }

            if (
                error?.code ===
                    "source_snapshot_changed" ||
                error?.code ===
                    "source_document_not_found"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "原本の状態が変わっています。再解析してください"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者登録判断の保存に失敗しました"
            });
        }
    }
);

app.get(
    "/source-record-identity-mapping",
    async (req, res) => {
        try {
            const queryKeys =
                Object.keys(req.query || {});

            const allowedQueryKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";

            const rawSourceSize =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";

            const sourceSize =
                /^\d+$/.test(rawSourceSize)
                    ? Number(rawSourceSize)
                    : Number.NaN;

            if (
                queryKeys.length !== 3 ||
                queryKeys.some(
                    key => !allowedQueryKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "原本レコードIDの取得条件が不正です"
                });
            }

            const identityService =
                await app.locals
                    .getSourceRecordIdentityMappingService();

            const result =
                await identityService.get({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize
                });

            if (result?.status === "not_found") {
                return res.status(200).json({
                    success: true,
                    status: "not_found",
                    mapping: null
                });
            }

            if (
                result?.status === "found" &&
                result.mapping &&
                typeof result.mapping.sourceFieldKey ===
                    "string" &&
                result.mapping.sourceFieldKey.trim()
            ) {
                return res.status(200).json({
                    success: true,
                    status: "found",
                    mapping:
                        result.mapping
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
                error instanceof TypeError ||
                error?.code ===
                    "source_record_identity_mapping_query_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "原本レコードIDの取得条件が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "原本レコードIDの取得に失敗しました"
            });
        }
    }
);

app.post(
    "/source-record-identity-mapping",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);

            const allowedInputKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize",
                    "sourceFieldKey"
                ]);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";

            const sourceSize =
                input.sourceSize;

            const sourceFieldKey =
                typeof input.sourceFieldKey === "string"
                    ? input.sourceFieldKey.trim()
                    : "";

            if (
                inputKeys.length !== 4 ||
                inputKeys.some(
                    key => !allowedInputKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0 ||
                !sourceFieldKey
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "原本レコードIDの確認内容が不正です"
                });
            }

            const identityService =
                await app.locals
                    .getSourceRecordIdentityMappingService();

            const result =
                await identityService.confirm({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize,
                    sourceFieldKey
                });

            if (
                result?.status === "confirmed" &&
                result.mapping &&
                typeof result.mapping.sourceFieldKey ===
                    "string" &&
                result.mapping.sourceFieldKey.trim() &&
                result.validation &&
                Number.isSafeInteger(
                    result.validation.sourceEntityCount
                ) &&
                Number.isSafeInteger(
                    result.validation.uniqueValueCount
                )
            ) {
                return res.status(200).json({
                    success: true,
                    status: "confirmed",
                    persistenceStatus:
                        result.persistenceStatus,
                    mapping:
                        result.mapping,
                    validation:
                        result.validation
                });
            }

            if (result?.status === "invalid") {
                return res.status(422).json({
                    success: false,
                    errorCode:
                        typeof result.errorCode === "string"
                            ? result.errorCode
                            : "source_record_identity_validation_invalid",
                    validation: {
                        sourceEntityCount:
                            Number.isSafeInteger(
                                result.sourceEntityCount
                            )
                                ? result.sourceEntityCount
                                : null,
                        missingFieldCount:
                            Number.isSafeInteger(
                                result.missingFieldCount
                            )
                                ? result.missingFieldCount
                                : null,
                        blankValueCount:
                            Number.isSafeInteger(
                                result.blankValueCount
                            )
                                ? result.blankValueCount
                                : null,
                        duplicateValueCount:
                            Number.isSafeInteger(
                                result.duplicateValueCount
                            )
                                ? result.duplicateValueCount
                                : null,
                        uniqueValueCount:
                            Number.isSafeInteger(
                                result.uniqueValueCount
                            )
                                ? result.uniqueValueCount
                                : null
                    },
                    message:
                        "原本レコードIDとして使用できない項目です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "原本レコードIDの確認結果が不正です"
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
                error instanceof TypeError ||
                error?.code ===
                    "source_record_identity_mapping_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "原本レコードIDの確認内容が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "原本レコードIDの保存に失敗しました"
            });
        }
    }
);

app.get(
    "/source-resident-links",
    async (req, res) => {
        try {
            const queryKeys =
                Object.keys(req.query || {});

            const allowedQueryKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof req.query?.sourceDocumentKey === "string"
                    ? req.query.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof req.query?.sourceUpdatedAt === "string"
                    ? req.query.sourceUpdatedAt.trim()
                    : "";

            const rawSourceSize =
                typeof req.query?.sourceSize === "string"
                    ? req.query.sourceSize.trim()
                    : "";

            const sourceSize =
                /^\d+$/.test(rawSourceSize)
                    ? Number(rawSourceSize)
                    : Number.NaN;

            if (
                queryKeys.length !== 3 ||
                queryKeys.some(
                    key => !allowedQueryKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者紐付けの取得条件が不正です"
                });
            }

            const client =
                await app.locals
                    .getSourceResidentLinkClient();

            const result =
                await client.list({
                    sourceDocumentKey,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize
                });

            if (
                result?.status === "found" &&
                Array.isArray(result.links)
            ) {
                return res.status(200).json({
                    success: true,
                    status: "found",
                    links:
                        result.links
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
                "source_resident_link_query_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者紐付けの取得条件が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者紐付けの取得に失敗しました"
            });
        }
    }
);

app.post(
    "/import-preview",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const allowedKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const keys =
                Object.keys(input);

            if (
                keys.length !== 3 ||
                keys.some(
                    key => !allowedKeys.has(key)
                )
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "取り込みプレビューの条件が不正です"
                });
            }

            const confirmedDocumentTypeService =
                await app.locals
                    .getConfirmedDocumentTypeService();

            const confirmedDocumentTypeResult =
                await confirmedDocumentTypeService.get({
                    sourceDocumentKey:
                        input.sourceDocumentKey,
                    sourceUpdatedAt:
                        input.sourceUpdatedAt,
                    sourceSize:
                        input.sourceSize
                });

            if (
                confirmedDocumentTypeResult?.status !== "found" ||
                !confirmedDocumentTypeResult.confirmation ||
                typeof confirmedDocumentTypeResult
                    .confirmation.documentType !== "string" ||
                !confirmedDocumentTypeResult
                    .confirmation.documentType.trim()
            ) {
                return res.status(409).json({
                    success: false,
                    status:
                        "document_type_confirmation_required",
                    message:
                        "データ種別の確認が必要です"
                });
            }

            const trustedDocumentType =
                confirmedDocumentTypeResult
                    .confirmation.documentType.trim();

            let previewService;

            if (trustedDocumentType === "support_record") {
                previewService =
                    await app.locals
                        .getImportPreviewService();
            } else if (
                trustedDocumentType ===
                    "recipient_certificate"
            ) {
                previewService =
                    await app.locals
                        .getRecipientCertificateImportPreviewService();
            } else {
                return res.status(409).json({
                    success: false,
                    status:
                        "document_type_not_supported_for_preview",
                    message:
                        "このデータ種別の取り込みプレビューはまだ利用できません"
                });
            }

            const result =
                await previewService.preview({
                    sourceDocumentKey:
                        input.sourceDocumentKey,
                    sourceUpdatedAt:
                        input.sourceUpdatedAt,
                    sourceSize:
                        input.sourceSize
                });

            return res.status(200).json({
                success: true,
                ...result
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
                error instanceof TypeError ||
                error?.code ===
                    "resident_identifier_mapping_unavailable"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "取り込みプレビューの条件が整っていません"
                });
            }


            return res.status(503).json({
                success: false,
                message:
                    "取り込みプレビューに失敗しました"
            });
        }
    }
);


app.post(
    "/import-execute",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const allowedKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize",
                    "expectedFingerprint"
                ]);

            const keys =
                Object.keys(input);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";

            const expectedFingerprint =
                typeof input.expectedFingerprint === "string"
                    ? input.expectedFingerprint.trim()
                    : "";

            const sourceSize =
                input.sourceSize;

            if (
                keys.length !== 4 ||
                keys.some(
                    key => !allowedKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                !Number.isInteger(sourceSize) ||
                sourceSize < 0 ||
                !/^[0-9a-f]{64}$/.test(
                    expectedFingerprint
                )
            ) {
                return res.status(422).json({
                    success: false,
                    status: "invalid",
                    message:
                        "最終確定の条件が不正です"
                });
            }

            const confirmedDocumentTypeService =
                await app.locals
                    .getConfirmedDocumentTypeService();

            const confirmedDocumentTypeResult =
                await confirmedDocumentTypeService.get({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

            if (
                confirmedDocumentTypeResult?.status !== "found" ||
                !confirmedDocumentTypeResult.confirmation ||
                typeof confirmedDocumentTypeResult
                    .confirmation.documentType !== "string" ||
                !confirmedDocumentTypeResult
                    .confirmation.documentType.trim()
            ) {
                return res.status(409).json({
                    success: false,
                    status:
                        "document_type_confirmation_required",
                    message:
                        "データ種別の確認が必要です"
                });
            }

            const trustedDocumentType =
                confirmedDocumentTypeResult
                    .confirmation.documentType.trim();

            if (
                ![
                    "support_record",
                    "recipient_certificate"
                ].includes(trustedDocumentType)
            ) {
                return res.status(409).json({
                    success: false,
                    status:
                        "document_type_not_supported_for_execution",
                    message:
                        "このデータ種別の最終確定はまだ利用できません"
                });
            }

            const executionService =
                trustedDocumentType === "recipient_certificate"
                    ? await app.locals
                        .getRecipientCertificateImportExecutionService()
                    : await app.locals
                        .getImportExecutionService();

            const result =
                await executionService.execute({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize,
                    expectedFingerprint
                });

            if (
                trustedDocumentType ===
                "recipient_certificate"
            ) {
            }

            if (
                result &&
                result.status === "completed"
            ) {
                if (
                    trustedDocumentType ===
                    "recipient_certificate"
                ) {
                    return res.status(200).json({
                        success: true,
                        status: "completed",
                        processed:
                            result.processed,
                        created:
                            result.created,
                        updated:
                            result.updated,
                        unchanged:
                            result.unchanged,
                        residentsCreated:
                            result.residentsCreated
                    });
                }

                return res.status(200).json({
                    success: true,
                    status: "completed",
                    processed:
                        result.processed,
                    created:
                        result.created,
                    updated:
                        result.updated,
                    alreadyApplied:
                        result.alreadyApplied
                });
            }

            if (
                result &&
                (
                    result.status === "stale" ||
                    result.status === "blocked" ||
                    result.status === "invalid"
                )
            ) {
                return res.status(409).json({
                    success: false,
                    status:
                        result.status,
                    message:
                        "取り込み条件が変わったため、プレビューの再確認が必要です"
                });
            }

            if (
                result &&
                (
                    result.status === "conflict" ||
                    result.status === "resident_mismatch"
                )
            ) {
                return res.status(409).json({
                    success: false,
                    status:
                        result.status,
                    sourceRecordKey:
                        typeof result.sourceRecordKey === "string"
                            ? result.sourceRecordKey
                            : null,
                    processed:
                        result.processed,
                    created:
                        result.created,
                    updated:
                        result.updated,
                    alreadyApplied:
                        result.alreadyApplied,
                    message:
                        "取り込み途中で現在のデータとの差異を検出しました。プレビューの再確認が必要です"
                });
            }

            return res.status(503).json({
                success: false,
                status: "error",
                processed:
                    Number.isInteger(
                        result?.processed
                    )
                        ? result.processed
                        : 0,
                created:
                    Number.isInteger(
                        result?.created
                    )
                        ? result.created
                        : 0,
                updated:
                    Number.isInteger(
                        result?.updated
                    )
                        ? result.updated
                        : 0,
                alreadyApplied:
                    Number.isInteger(
                        result?.alreadyApplied
                    )
                        ? result.alreadyApplied
                        : 0,
                message:
                    "取り込み結果を確定できませんでした。自動再試行せず、プレビューを再確認してください"
            });
        } catch (error) {
            if (
                error?.code ===
                "connector_trust_denied"
            ) {
                return res.status(401).json({
                    success: false,
                    status: "denied",
                    message:
                        "Connector認証に失敗しました"
                });
            }

            return res.status(503).json({
                success: false,
                status: "error",
                message:
                    "取り込み結果を確定できませんでした。自動再試行せず、プレビューを再確認してください"
            });
        }
    }
);

app.post(
    "/source-resident-links",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);

            const allowedInputKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceEntityKey",
                    "linkStatus",
                    "residentId",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";

            const sourceEntityKey =
                typeof input.sourceEntityKey === "string"
                    ? input.sourceEntityKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";

            const linkStatus =
                typeof input.linkStatus === "string"
                    ? input.linkStatus.trim()
                    : "";

            const sourceSize =
                input.sourceSize;

            const residentId =
                typeof input.residentId === "string"
                    ? input.residentId.trim()
                    : input.residentId;

            const validStatuses =
                new Set([
                    "confirmed",
                    "deferred",
                    "no_match"
                ]);

            if (
                inputKeys.length !== 6 ||
                inputKeys.some(
                    key => !allowedInputKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceEntityKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0 ||
                !validStatuses.has(linkStatus) ||
                (
                    linkStatus === "confirmed" &&
                    (
                        typeof residentId !== "string" ||
                        !residentId
                    )
                ) ||
                (
                    linkStatus !== "confirmed" &&
                    residentId != null
                )
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者紐付けの送信内容が不正です"
                });
            }

            const client =
                await app.locals
                    .getSourceResidentLinkClient();

            const result =
                await client.save({
                    sourceDocumentKey,
                    sourceEntityKey,
                    linkStatus,
                    residentId:
                        linkStatus === "confirmed"
                            ? residentId
                            : null,
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize
                });

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
                "source_resident_link_invalid"
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者紐付けの送信内容が不正です"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者紐付けの保存に失敗しました"
            });
        }
    }
);

app.post(
    "/resident-candidate-groups",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);

            const allowedInputKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize"
                ]);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";

            const sourceSize =
                input.sourceSize;

            if (
                inputKeys.some(
                    key => !allowedInputKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者候補グループ検索の送信内容が不正です"
                });
            }

            const candidateResolver =
                await app.locals
                    .getResidentCandidateService();

            const result =
                await candidateResolver
                    .findCandidateGroups({
                        sourceDocumentKey,
                        sourceUpdatedAt:
                            new Date(sourceUpdatedAt)
                                .toISOString(),
                        sourceSize
                    });

            if (
                !result ||
                ![
                    "user_code",
                    "name"
                ].includes(result.identifierType) ||
                !Number.isSafeInteger(
                    result.sourceEntityCount
                ) ||
                !Number.isSafeInteger(
                    result.unavailableSourceEntityCount
                ) ||
                !Array.isArray(result.groups) ||
                result.groups.some(
                    group =>
                        !group ||
                        ![
                            "matched",
                            "ambiguous",
                            "not_found"
                        ].includes(group.status) ||
                        ![
                            "user_code",
                            "name"
                        ].includes(
                            group.identifierType
                        ) ||
                        typeof group.identifierDigest !==
                            "string" ||
                        !/^[0-9a-f]{64}$/.test(
                            group.identifierDigest
                        ) ||
                        (
                            group.identifierType === "name" &&
                            (
                                typeof group.identifierValue !== "string" ||
                                !group.identifierValue.trim()
                            )
                        ) ||
                        (
                            group.identifierType === "user_code" &&
                            group.identifierValue !== null
                        ) ||
                        !Number.isSafeInteger(
                            group.sourceEntityCount
                        ) ||
                        group.sourceEntityCount < 1 ||
                        !Array.isArray(
                            group.candidates
                        )
                )
            ) {
                return res.status(503).json({
                    success: false,
                    message:
                        "利用者候補グループの応答が不正です"
                });
            }

            return res.status(200).json({
                success: true,
                identifierType:
                    result.identifierType,
                identifierHeaderLabel:
                    typeof result.identifierHeaderLabel === "string" &&
                    result.identifierHeaderLabel.trim()
                        ? result.identifierHeaderLabel.trim()
                        : null,
                identityDiagnostic:
                    result.identityDiagnostic &&
                    typeof result.identityDiagnostic === "object"
                        ? {
                            fieldDefinitionMatched:
                                result.identityDiagnostic.fieldDefinitionMatched === true,
                            mappingHasHeaderLabel:
                                result.identityDiagnostic.mappingHasHeaderLabel === true,
                            keyPresentInEverySourceEntity:
                                result.identityDiagnostic.keyPresentInEverySourceEntity === true,
                            fieldDefinitionCount:
                                Number.isSafeInteger(
                                    result.identityDiagnostic.fieldDefinitionCount
                                )
                                    ? result.identityDiagnostic.fieldDefinitionCount
                                    : null
                        }
                        : null,
                sourceEntityCount:
                    result.sourceEntityCount,
                unavailableSourceEntityCount:
                    result.unavailableSourceEntityCount,
                groups:
                    result.groups
            });
        } catch (error) {
            if (
                [
                    "resident_identifier_mapping_unavailable",
                    "source_entities_unavailable",
                    "resident_candidate_response_invalid"
                ].includes(error?.code)
            ) {
                return res.status(422).json({
                    success: false,
                    errorCode:
                        error.code,
                    identityReason:
                        [
                            "resident_mapping_missing",
                            "human_confirmation_missing",
                            "confirmed_meaning_mismatch",
                            "resident_identity_mapping_ambiguous"
                        ].includes(error?.identityReason)
                            ? error.identityReason
                            : null,
                    message:
                        "利用者候補グループを確認できませんでした"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者候補グループの取得に失敗しました"
            });
        }
    }
);

app.post(
    "/resident-candidates",
    async (req, res) => {
        try {
            const input =
                req.body &&
                typeof req.body === "object" &&
                !Array.isArray(req.body)
                    ? req.body
                    : {};

            const inputKeys =
                Object.keys(input);

            const allowedInputKeys =
                new Set([
                    "sourceDocumentKey",
                    "sourceUpdatedAt",
                    "sourceSize",
                    "sourceEntityKey"
                ]);

            const sourceDocumentKey =
                typeof input.sourceDocumentKey === "string"
                    ? input.sourceDocumentKey.trim()
                    : "";

            const sourceUpdatedAt =
                typeof input.sourceUpdatedAt === "string"
                    ? input.sourceUpdatedAt.trim()
                    : "";

            const sourceEntityKey =
                typeof input.sourceEntityKey === "string"
                    ? input.sourceEntityKey.trim()
                    : "";

            const sourceSize =
                input.sourceSize;

            if (
                inputKeys.length !== 4 ||
                inputKeys.some(
                    key => !allowedInputKeys.has(key)
                ) ||
                !sourceDocumentKey ||
                !sourceUpdatedAt ||
                Number.isNaN(
                    Date.parse(sourceUpdatedAt)
                ) ||
                !Number.isSafeInteger(sourceSize) ||
                sourceSize < 0 ||
                !sourceEntityKey
            ) {
                return res.status(422).json({
                    success: false,
                    message:
                        "利用者候補検索の送信内容が不正です"
                });
            }

            const candidateResolver =
                await app.locals
                    .getResidentCandidateService();

            const result =
                await candidateResolver
                    .findCandidates({
                        sourceDocumentKey,
                        sourceUpdatedAt:
                            new Date(sourceUpdatedAt)
                                .toISOString(),
                        sourceSize,
                        sourceEntityKey
                    });

            if (
                !result ||
                ![
                    "matched",
                    "ambiguous",
                    "not_found"
                ].includes(result.status) ||
                !Array.isArray(result.candidates)
            ) {
                return res.status(503).json({
                    success: false,
                    message:
                        "利用者候補の応答が不正です"
                });
            }

            return res.status(200).json({
                success: true,
                status:
                    result.status,
                candidates:
                    result.candidates
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
                [
                    "source_snapshot_invalid",
                    "source_document_not_found",
                    "source_snapshot_changed",
                    "source_snapshot_unsupported",
                    "source_entities_unavailable",
                    "source_entity_invalid",
                    "source_entity_not_found",
                    "resident_identifier_mapping_unavailable",
                    "resident_identifier_unavailable",
                    "resident_candidate_query_invalid"
                ].includes(error?.code)
            ) {
                console.error(
                    "resident_candidate_error",
                    { errorCode: error.code }
                );

                return res.status(422).json({
                    success: false,
                    message:
                        "利用者候補検索の条件を確認してください"
                });
            }

            return res.status(503).json({
                success: false,
                message:
                    "利用者候補の取得に失敗しました"
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
