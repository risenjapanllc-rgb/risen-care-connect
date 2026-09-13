"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("./server");

test("POST /files/:fileName/observe observes a registered file", async () => {
    const service = app.locals.localConnectorService;
    assert.ok(service);
    assert.strictEqual(typeof service.observeRegisteredFile, "function");

    const original = service.observeRegisteredFile;
    let observedFileName;
    service.observeRegisteredFile = async fileName => {
        observedFileName = fileName;
        return {
            sourceDocumentKey: "opaque-document-key-001",
            relativePath: fileName,
            relativePathLookupKey: fileName,
            fileName,
            firstSeenAt: "2026-09-06T08:00:00.000Z",
            lastSeenAt: "2026-09-06T08:00:00.000Z",
            lastObservedUpdatedAt: "2026-09-06T07:59:00.000Z",
            lastObservedSize: 123
        };
    };

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

    try {
        const address = server.address();
        const response = await fetch(`http://127.0.0.1:${address.port}/files/support.xlsx/observe`, {
            method: "POST"
        });
        const body = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(observedFileName, "support.xlsx");
        assert.deepStrictEqual(body, {
            success: true,
            sourceDocumentKey: "opaque-document-key-001",
            fileName: "support.xlsx",
            observedUpdatedAt: "2026-09-06T07:59:00.000Z",
            observedSize: 123
        });
    } finally {
        service.observeRegisteredFile = original;
        await new Promise(resolve => server.close(resolve));
    }
});

test("POST /files/:fileName/analyze analyzes a registered Word document", async () => {
    const service = app.locals.localConnectorService;
    const original = service.normalizeRegisteredWord;
    const originalObserve = service.observeRegisteredFile;

    service.observeRegisteredFile = async fileName => ({
        sourceDocumentKey: "opaque-document-key-word",
        fileName
    });

    let analyzedFileName;

    service.normalizeRegisteredWord = async fileName => {
        analyzedFileName = fileName;

        return {
            sourceType: "word",
            documentType: "assessment",
            documentTypeConfidence: "high",
            source: {
                fileName: "assessment.docx",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            content: {
                text: "任意のWord本文"
            },
            extracted: {
                sourceResidentIdentifier: {
                    value: "resident-001",
                    sourceLabel: "利用者ID"
                },
                sourceResidentName: {
                    value: "山田太郎",
                    sourceLabel: "利用者名"
                }
            }
        };
    };

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

    try {
        const address = server.address();

        const response = await fetch(
            `http://127.0.0.1:${address.port}/files/assessment.docx/analyze`,
            {
                method: "POST"
            }
        );

        const body = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(analyzedFileName, "assessment.docx");

        assert.deepStrictEqual(body, {
            success: true,
            fileName: "assessment.docx",
            sourceDocumentKey: "opaque-document-key-word",
            sourceType: "word",
            documentType: "assessment",
            documentTypeConfidence: "high",
            source: {
                fileName: "assessment.docx",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            content: {
                text: "任意のWord本文"
            },
            extracted: {
                sourceResidentIdentifier: {
                    value: "resident-001",
                    sourceLabel: "利用者ID"
                },
                sourceResidentName: {
                    value: "山田太郎",
                    sourceLabel: "利用者名"
                }
            }
        });
    } finally {
        service.normalizeRegisteredWord = original;
        service.observeRegisteredFile = originalObserve;
        await new Promise(resolve => server.close(resolve));
    }
});

test("POST /files/:fileName/analyze analyzes a registered Excel document", async () => {
    const service = app.locals.localConnectorService;
    const original = service.normalizeRegisteredExcel;
    const originalObserve = service.observeRegisteredFile;

    service.observeRegisteredFile = async fileName => ({
        sourceDocumentKey: "opaque-document-key-excel",
        fileName
    });

    let analyzedFileName;

    service.normalizeRegisteredExcel = async fileName => {
        analyzedFileName = fileName;

        return {
            sourceType: "excel",
            documentType: "assessment",
            documentTypeConfidence: "medium",
            source: {
                fileName: "assessment.xlsx",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            content: {
                sheetNames: ["Sheet1"],
                sheets: [
                    {
                        sheetName: "Sheet1",
                        rows: [
                            ["項目A", "項目B"],
                            ["値1", "値2"]
                        ]
                    }
                ]
            },
            extracted: {
                fieldDefinitions: [
                    {
                        sourceFieldKey: "sheet:0:column:0",
                        sheetIndex: 0,
                        sheetName: "Sheet1",
                        columnIndex: 0,
                        headerLabel: "項目A"
                    },
                    {
                        sourceFieldKey: "sheet:0:column:1",
                        sheetIndex: 0,
                        sheetName: "Sheet1",
                        columnIndex: 1,
                        headerLabel: "項目B"
                    }
                ],
                sourceResidentIdentifier: {
                    value: "resident-001",
                    sourceLabel: "利用者ID"
                }
            }
        };
    };

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

    try {
        const address = server.address();

        const response = await fetch(
            `http://127.0.0.1:${address.port}/files/assessment.xlsx/analyze`,
            {
                method: "POST"
            }
        );

        const body = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(analyzedFileName, "assessment.xlsx");

        assert.deepStrictEqual(body, {
            success: true,
            fileName: "assessment.xlsx",
            sourceDocumentKey: "opaque-document-key-excel",
            sourceType: "excel",
            documentType: "assessment",
            documentTypeConfidence: "medium",
            source: {
                fileName: "assessment.xlsx",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            content: {
                sheetNames: ["Sheet1"],
                sheets: [
                    {
                        sheetName: "Sheet1",
                        rows: [
                            ["項目A", "項目B"],
                            ["値1", "値2"]
                        ]
                    }
                ]
            },
            extracted: {
                fieldDefinitions: [
                    {
                        sourceFieldKey: "sheet:0:column:0",
                        sheetIndex: 0,
                        sheetName: "Sheet1",
                        columnIndex: 0,
                        headerLabel: "項目A"
                    },
                    {
                        sourceFieldKey: "sheet:0:column:1",
                        sheetIndex: 0,
                        sheetName: "Sheet1",
                        columnIndex: 1,
                        headerLabel: "項目B"
                    }
                ],
                sourceResidentIdentifier: {
                    value: "resident-001",
                    sourceLabel: "利用者ID"
                }
            }
        });
    } finally {
        service.normalizeRegisteredExcel = original;
        service.observeRegisteredFile = originalObserve;
        await new Promise(resolve => server.close(resolve));
    }
});

test("POST /files/:fileName/analyze analyzes a registered CSV document", async () => {
    const service = app.locals.localConnectorService;
    const original = service.normalizeRegisteredCsv;
    const originalObserve = service.observeRegisteredFile;

    service.observeRegisteredFile = async fileName => ({
        sourceDocumentKey: "opaque-document-key-csv",
        fileName
    });

    let analyzedFileName;

    service.normalizeRegisteredCsv = async fileName => {
        analyzedFileName = fileName;

        return {
            sourceType: "csv",
            documentType: "unknown",
            documentTypeConfidence: "low",
            source: {
                fileName: "records.csv",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            content: {
                sheetNames: ["csv"],
                sheets: [
                    {
                        sheetName: "csv",
                        rows: [
                            ["項目A", "項目B"],
                            ["値1", "値2"]
                        ]
                    }
                ]
            },
            extracted: {
                fieldDefinitions: [
                    {
                        sourceFieldKey: "sheet:0:column:0",
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 0,
                        headerLabel: "項目A"
                    },
                    {
                        sourceFieldKey: "sheet:0:column:1",
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 1,
                        headerLabel: "項目B"
                    }
                ],
                sourceFields: []
            }
        };
    };

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

    try {
        const address = server.address();

        const response = await fetch(
            `http://127.0.0.1:${address.port}/files/records.csv/analyze`,
            {
                method: "POST"
            }
        );

        const body = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(analyzedFileName, "records.csv");

        assert.deepStrictEqual(body, {
            success: true,
            fileName: "records.csv",
            sourceDocumentKey: "opaque-document-key-csv",
            sourceType: "csv",
            documentType: "unknown",
            documentTypeConfidence: "low",
            source: {
                fileName: "records.csv",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            content: {
                sheetNames: ["csv"],
                sheets: [
                    {
                        sheetName: "csv",
                        rows: [
                            ["項目A", "項目B"],
                            ["値1", "値2"]
                        ]
                    }
                ]
            },
            extracted: {
                fieldDefinitions: [
                    {
                        sourceFieldKey: "sheet:0:column:0",
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 0,
                        headerLabel: "項目A"
                    },
                    {
                        sourceFieldKey: "sheet:0:column:1",
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 1,
                        headerLabel: "項目B"
                    }
                ],
                sourceFields: []
            }
        });
    } finally {
        service.normalizeRegisteredCsv = original;
        service.observeRegisteredFile = originalObserve;
        await new Promise(resolve => server.close(resolve));
    }
});

test("POST /files/:fileName/analyze rejects unsupported file types", async () => {
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

    try {
        const address = server.address();

        const response = await fetch(
            `http://127.0.0.1:${address.port}/files/assessment.pdf/analyze`,
            {
                method: "POST"
            }
        );

        const body = await response.json();

        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(body, {
            success: false,
            message: "Word、Excel、CSVファイルのみ解析できます"
        });
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test("GET /files returns relative paths for registered files", async () => {
    const service = app.locals.localConnectorService;
    assert.ok(service);
    assert.strictEqual(
        typeof service.getRegisteredFolderStatus,
        "function"
    );

    const original =
        service.getRegisteredFolderStatus;

    service.getRegisteredFolderStatus = async () => ({
        status: "ready",
        folderName: "RISEN CARE取込フォルダ",
        fileCount: 2,
        wordCount: 1,
        excelCount: 1,
        checkedAt:
            "2026-09-08T10:00:00.000Z",
        files: [
            {
                relativePath:
                    "個別支援計画/山田さん.docx",
                fileName: "山田さん.docx",
                extension: ".docx",
                size: 123,
                updatedAt:
                    "2026-09-08T09:00:00.000Z"
            },
            {
                relativePath:
                    "支援記録/2026年9月/山田さん.xlsx",
                fileName: "山田さん.xlsx",
                extension: ".xlsx",
                size: 456,
                updatedAt:
                    "2026-09-08T09:30:00.000Z"
            }
        ]
    });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files`
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            200
        );

        assert.deepStrictEqual(
            body.files,
            [
                {
                    relativePath:
                        "個別支援計画/山田さん.docx",
                    fileName:
                        "山田さん.docx",
                    extension:
                        ".docx",
                    size: 123,
                    updatedAt:
                        "2026-09-08T09:00:00.000Z"
                },
                {
                    relativePath:
                        "支援記録/2026年9月/山田さん.xlsx",
                    fileName:
                        "山田さん.xlsx",
                    extension:
                        ".xlsx",
                    size: 456,
                    updatedAt:
                        "2026-09-08T09:30:00.000Z"
                }
            ]
        );
    } finally {
        service.getRegisteredFolderStatus =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("GET /identity returns the Local Connector ID", async () => {
    const service =
        app.locals.localConnectorService;

    assert.ok(service);
    assert.strictEqual(
        typeof service.getConnectorId,
        "function"
    );

    const original =
        service.getConnectorId;

    service.getConnectorId =
        async () => "connector-test-001";

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/identity`
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            200
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                connectorId:
                    "connector-test-001"
            }
        );
    } finally {
        service.getConnectorId =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /files/:fileName/ingest explicitly sends a registered file", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    let ingestedFileName;

    app.locals.getLocalConnectorIngestionService =
        async () => ({
            async ingestRegisteredFile(fileName) {
                ingestedFileName =
                    fileName;

                return {
                    requestId:
                        "request-ingest-001",
                    status:
                        "unmatched"
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files/support.docx/ingest`,
                {
                    method: "POST"
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            200
        );

        assert.strictEqual(
            ingestedFileName,
            "support.docx"
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                requestId:
                    "request-ingest-001",
                status:
                    "unmatched"
            }
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /files/:fileName/ingest does not accept facilityId or residentId from request body", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    let receivedArguments;

    app.locals.getLocalConnectorIngestionService =
        async () => ({
            async ingestRegisteredFile(...args) {
                receivedArguments =
                    args;

                return {
                    requestId:
                        "request-ingest-002",
                    status:
                        "unmatched"
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files/support.xlsx/ingest`,
                {
                    method: "POST",
                    headers: {
                        "content-type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            facilityId:
                                "client-facility",
                            residentId:
                                "client-resident"
                        })
                }
            );

        assert.strictEqual(
            response.status,
            200
        );

        assert.deepStrictEqual(
            receivedArguments,
            [
                "support.xlsx"
            ]
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /files/:fileName/ingest sanitizes ingestion failure", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    app.locals.getLocalConnectorIngestionService =
        async () => ({
            async ingestRegisteredFile() {
                throw new Error(
                    "credential-secret must not leak"
                );
            }
        });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files/support.docx/ingest`,
                {
                    method: "POST"
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );

        assert.deepStrictEqual(
            body,
            {
                success: false,
                message:
                    "Server Trust Boundaryへの送信に失敗しました"
            }
        );

        assert.strictEqual(
            JSON.stringify(body)
                .includes(
                    "credential-secret"
                ),
            false
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("existing health endpoint does not initialize ingestion service", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    let initialized = false;

    app.locals.getLocalConnectorIngestionService =
        async () => {
            initialized = true;

            throw new Error(
                "must not initialize"
            );
        };

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/health`
            );

        assert.strictEqual(
            response.status,
            200
        );

        assert.strictEqual(
            initialized,
            false
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /files/:fileName/ingest maps denied to HTTP 401", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    app.locals.getLocalConnectorIngestionService =
        async () => ({
            async ingestRegisteredFile() {
                const error =
                    new Error(
                        "Server Trust Boundary request failed"
                    );

                error.code =
                    "connector_trust_denied";
                error.httpStatus =
                    401;
                error.requestId =
                    "request-denied-001";

                throw error;
            }
        });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files/support.docx/ingest`,
                {
                    method: "POST"
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            401
        );

        assert.deepStrictEqual(
            body,
            {
                success: false,
                requestId:
                    "request-denied-001",
                status:
                    "denied",
                errorCode:
                    "connector_trust_denied"
            }
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /files/:fileName/ingest maps invalid to HTTP 422", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    app.locals.getLocalConnectorIngestionService =
        async () => ({
            async ingestRegisteredFile() {
                const error =
                    new Error(
                        "Server Trust Boundary request failed"
                    );

                error.code =
                    "connector_payload_invalid";
                error.httpStatus =
                    422;
                error.requestId =
                    "request-invalid-001";

                throw error;
            }
        });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files/support.docx/ingest`,
                {
                    method: "POST"
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            422
        );

        assert.deepStrictEqual(
            body,
            {
                success: false,
                requestId:
                    "request-invalid-001",
                status:
                    "invalid",
                errorCode:
                    "connector_payload_invalid"
            }
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /files/:fileName/ingest maps Server Trust Boundary error to HTTP 503", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    app.locals.getLocalConnectorIngestionService =
        async () => ({
            async ingestRegisteredFile() {
                const error =
                    new Error(
                        "Server Trust Boundary request failed"
                    );

                error.code =
                    "connector_processing_unavailable";
                error.httpStatus =
                    503;
                error.requestId =
                    "request-error-001";

                throw error;
            }
        });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files/support.docx/ingest`,
                {
                    method: "POST"
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );

        assert.deepStrictEqual(
            body,
            {
                success: false,
                requestId:
                    "request-error-001",
                status:
                    "error",
                errorCode:
                    "connector_processing_unavailable"
            }
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /files/:fileName/ingest fails closed on unknown result status", async () => {
    const original =
        app.locals.getLocalConnectorIngestionService;

    app.locals.getLocalConnectorIngestionService =
        async () => ({
            async ingestRegisteredFile() {
                return {
                    requestId:
                        "request-unknown-001",
                    status:
                        "unexpected",
                    errorCode:
                        "remote-secret-detail"
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/files/support.docx/ingest`,
                {
                    method: "POST"
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );

        assert.deepStrictEqual(
            body,
            {
                success: false,
                message:
                    "Server Trust Boundaryから不正な応答を受信しました"
            }
        );

        assert.strictEqual(
            JSON.stringify(body)
                .includes(
                    "remote-secret-detail"
                ),
            false
        );
    } finally {
        app.locals.getLocalConnectorIngestionService =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("does not expose X-Powered-By header", async () => {
    const server =
        http.createServer(app);

    await new Promise(
        resolve =>
            server.listen(
                0,
                "127.0.0.1",
                resolve
            )
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/health`
            );

        assert.equal(
            response.headers.get(
                "x-powered-by"
            ),
            null
        );
    } finally {
        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test(
    "POST /files/:fileName/source-document persists raw source independently of semantic ingestion",
    async () => {
        const original =
            app.locals
                .getSourceDocumentIngestionService;

        let ingestedFileName;

        app.locals.getSourceDocumentIngestionService =
            async () => ({
                async ingestRegisteredFile(
                    fileName
                ) {
                    ingestedFileName =
                        fileName;

                    return {
                        status:
                            "created"
                    };
                }
            });

        const server =
            http.createServer(app);

        await new Promise(
            resolve =>
                server.listen(
                    0,
                    "127.0.0.1",
                    resolve
                )
        );

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/files/support.csv/source-document`,
                    {
                        method:
                            "POST"
                    }
                );

            const body =
                await response.json();

            assert.strictEqual(
                response.status,
                200
            );

            assert.strictEqual(
                ingestedFileName,
                "support.csv"
            );

            assert.deepStrictEqual(
                body,
                {
                    success:
                        true,
                    status:
                        "created"
                }
            );
        } finally {
            app.locals
                .getSourceDocumentIngestionService =
                original;

            await new Promise(
                resolve =>
                    server.close(
                        resolve
                    )
            );
        }
    }
);


test(
    "POST /files/:fileName/source-document maps denied invalid and unavailable safely",
    async () => {
        const original =
            app.locals
                .getSourceDocumentIngestionService;

        const cases = [
            {
                code:
                    "connector_trust_denied",
                expectedStatus:
                    401
            },
            {
                code:
                    "connector_payload_invalid",
                expectedStatus:
                    422
            },
            {
                code:
                    "connector_processing_unavailable",
                expectedStatus:
                    503
            }
        ];

        const server =
            http.createServer(app);

        await new Promise(
            resolve =>
                server.listen(
                    0,
                    "127.0.0.1",
                    resolve
                )
        );

        try {
            const address =
                server.address();

            for (const item of cases) {
                app.locals
                    .getSourceDocumentIngestionService =
                    async () => ({
                        async ingestRegisteredFile() {
                            const error =
                                new Error(
                                    "remote failure"
                                );

                            error.code =
                                item.code;

                            error.httpStatus =
                                item.expectedStatus;

                            error.requestId =
                                "request-safe";

                            error.secret =
                                "must-not-leak";

                            throw error;
                        }
                    });

                const response =
                    await fetch(
                        `http://127.0.0.1:${address.port}/files/support.csv/source-document`,
                        {
                            method:
                                "POST"
                        }
                    );

                const body =
                    await response.json();

                assert.strictEqual(
                    response.status,
                    item.expectedStatus
                );

                assert.strictEqual(
                    body.success,
                    false
                );

                assert.strictEqual(
                    JSON.stringify(body).includes(
                        "must-not-leak"
                    ),
                    false
                );

                assert.strictEqual(
                    JSON.stringify(body).includes(
                        "remote failure"
                    ),
                    false
                );
            }
        } finally {
            app.locals
                .getSourceDocumentIngestionService =
                original;

            await new Promise(
                resolve =>
                    server.close(
                        resolve
                    )
            );
        }
    }
);


test(
    "POST /files/:fileName/source-document ignores facility resident and semantic fields from request body",
    async () => {
        const original =
            app.locals
                .getSourceDocumentIngestionService;

        let receivedArguments;

        app.locals.getSourceDocumentIngestionService =
            async () => ({
                async ingestRegisteredFile(...args) {
                    receivedArguments =
                        args;

                    return {
                        status:
                            "created"
                    };
                }
            });

        const server =
            http.createServer(app);

        await new Promise(
            resolve =>
                server.listen(
                    0,
                    "127.0.0.1",
                    resolve
                )
        );

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/files/support.xlsx/source-document`,
                    {
                        method:
                            "POST",
                        headers: {
                            "content-type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                facilityId:
                                    "untrusted-facility",
                                residentId:
                                    "untrusted-resident",
                                semanticRecords: [
                                    {
                                        semanticType:
                                            "untrusted"
                                    }
                                ]
                            })
                    }
                );

            const body =
                await response.json();

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                receivedArguments,
                [
                    "support.xlsx"
                ]
            );

            assert.deepStrictEqual(
                body,
                {
                    success:
                        true,
                    status:
                        "created"
                }
            );
        } finally {
            app.locals
                .getSourceDocumentIngestionService =
                original;

            await new Promise(
                resolve =>
                    server.close(
                        resolve
                    )
            );
        }
    }
);


test(
    "source field mapping route allowlists browser payload before ingestion",
    async () => {
        const originalFactory =
            app.locals
                .getSourceFieldMappingIngestionService;

        let received = null;

        app.locals.getSourceFieldMappingIngestionService =
            async () => ({
                async ingest(mapping) {
                    received = mapping;

                    return {
                        status: "created"
                    };
                }
            });

        const server =
            http.createServer(app);

        await new Promise(
            resolve =>
                server.listen(
                    0,
                    "127.0.0.1",
                    resolve
                )
        );

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/source-field-mappings`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sourceFieldMapping: {
                                    sourceDocumentKey:
                                        "document-key",
                                    sourceFieldKey:
                                        "sheet:0:column:3",
                                    standardEntityName:
                                        "user",
                                    standardFieldName:
                                        "blood_type",
                                    sheetName:
                                        "Sheet1",
                                    headerLabel:
                                        "血液型",

                                    facilityId:
                                        "must-not-pass",
                                    connectorId:
                                        "must-not-pass",
                                    confirmedAt:
                                        "2000-01-01T00:00:00.000Z",
                                    standardFieldId:
                                        15
                                }
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                await response.json(),
                {
                    success: true,
                    status: "created"
                }
            );

            assert.deepStrictEqual(
                received,
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceFieldKey:
                        "sheet:0:column:3",
                    standardEntityName:
                        "user",
                    standardFieldName:
                        "blood_type",
                    sheetName:
                        "Sheet1",
                    headerLabel:
                        "血液型"
                }
            );
        } finally {
            app.locals.getSourceFieldMappingIngestionService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(
                        resolve
                    )
            );
        }
    }
);


test(
    "source field interpretation route allowlists browser payload before ingestion",
    async () => {
        const originalFactory =
            app.locals
                .getSourceFieldInterpretationIngestionService;

        let received = null;

        app.locals.getSourceFieldInterpretationIngestionService =
            async () => ({
                async ingest(interpretation) {
                    received =
                        interpretation;

                    return {
                        status: "created"
                    };
                }
            });

        const server =
            http.createServer(app);

        await new Promise(
            resolve =>
                server.listen(
                    0,
                    "127.0.0.1",
                    resolve
                )
        );

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/source-field-interpretations`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sourceFieldInterpretation: {
                                    sourceDocumentKey:
                                        "document-key",
                                    sourceFieldKey:
                                        "sheet:0:column:3",
                                    interpretationStatus:
                                        "confirmed",
                                    mappingStatus:
                                        "no_standard_match",
                                    confirmedMeaning:
                                        null,
                                    facilityId:
                                        "must-not-pass",
                                    connectorId:
                                        "must-not-pass",
                                    confirmedAt:
                                        "2000-01-01T00:00:00.000Z",
                                    model:
                                        "must-not-pass"
                                }
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                await response.json(),
                {
                    success: true,
                    status: "created"
                }
            );

            assert.deepStrictEqual(
                received,
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceFieldKey:
                        "sheet:0:column:3",
                    interpretationStatus:
                        "confirmed",
                    mappingStatus:
                        "no_standard_match",
                    confirmedMeaning:
                        null
                }
            );
        } finally {
            app.locals.getSourceFieldInterpretationIngestionService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "GET /source-field-interpretations returns persisted review states",
    async () => {
        const originalFactory =
            app.locals
                .getSourceFieldInterpretationIngestionService;

        let receivedSourceDocumentKey = null;

        app.locals.getSourceFieldInterpretationIngestionService =
            async () => ({
                async list(sourceDocumentKey) {
                    receivedSourceDocumentKey =
                        sourceDocumentKey;

                    return {
                        status: "found",
                        interpretations: [
                            {
                                sourceFieldKey:
                                    "sheet:0:column:1",
                                interpretationStatus:
                                    "deferred",
                                mappingStatus:
                                    "unmapped",
                                confirmedMeaning:
                                    null,
                                confirmedByHuman:
                                    true
                            },
                            {
                                sourceFieldKey:
                                    "sheet:0:column:2",
                                interpretationStatus:
                                    "confirmed",
                                mappingStatus:
                                    "no_standard_match",
                                confirmedMeaning:
                                    null,
                                confirmedByHuman:
                                    true
                            }
                        ]
                    };
                }
            });

        const server =
            http.createServer(app);

        await new Promise(
            resolve =>
                server.listen(
                    0,
                    "127.0.0.1",
                    resolve
                )
        );

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/source-field-interpretations?sourceDocumentKey=document-key`
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.strictEqual(
                receivedSourceDocumentKey,
                "document-key"
            );

            assert.deepStrictEqual(
                await response.json(),
                {
                    success: true,
                    status: "found",
                    interpretations: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:1",
                            interpretationStatus:
                                "deferred",
                            mappingStatus:
                                "unmapped",
                            confirmedMeaning:
                                null,
                            confirmedByHuman:
                                true
                        },
                        {
                            sourceFieldKey:
                                "sheet:0:column:2",
                            interpretationStatus:
                                "confirmed",
                            mappingStatus:
                                "no_standard_match",
                            confirmedMeaning:
                                null,
                            confirmedByHuman:
                                true
                        }
                    ]
                }
            );
        } finally {
            app.locals.getSourceFieldInterpretationIngestionService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "GET /source-field-interpretations rejects missing sourceDocumentKey",
    async () => {
        const originalFactory =
            app.locals
                .getSourceFieldInterpretationIngestionService;

        let factoryCalled = false;

        app.locals.getSourceFieldInterpretationIngestionService =
            async () => {
                factoryCalled = true;

                throw new Error(
                    "must not be called"
                );
            };

        const server =
            http.createServer(app);

        await new Promise(
            resolve =>
                server.listen(
                    0,
                    "127.0.0.1",
                    resolve
                )
        );

        try {
            const address =
                server.address();

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/source-field-interpretations`
                );

            assert.strictEqual(
                response.status,
                422
            );

            assert.strictEqual(
                factoryCalled,
                false
            );

            assert.deepStrictEqual(
                await response.json(),
                {
                    success: false,
                    message:
                        "原本識別子が指定されていません"
                }
            );
        } finally {
            app.locals.getSourceFieldInterpretationIngestionService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);
