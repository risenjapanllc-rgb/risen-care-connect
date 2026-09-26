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
        fileName,
        lastObservedUpdatedAt:
            "2026-09-06T08:00:01.000Z",
        lastObservedSize:
            456
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
            sourceUpdatedAt:
                "2026-09-06T08:00:01.000Z",
            sourceSize:
                456,
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
        fileName,
        lastObservedUpdatedAt:
            "2026-09-06T08:00:02.000Z",
        lastObservedSize:
            654
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
            sourceUpdatedAt:
                "2026-09-06T08:00:02.000Z",
            sourceSize:
                654,
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
        fileName,
        lastObservedUpdatedAt:
            "2026-09-06T08:00:03.000Z",
        lastObservedSize:
            789
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
            sourceUpdatedAt:
                "2026-09-06T08:00:03.000Z",
            sourceSize:
                789,
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
    "POST /files/:fileName/source-document forwards only expected source snapshot",
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
                    `http://127.0.0.1:${address.port}/files/support.csv/source-document`,
                    {
                        method:
                            "POST",
                        headers: {
                            "content-type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sourceDocumentKey:
                                    "source-document-key",
                                sourceUpdatedAt:
                                    "2026-09-15T10:00:00.000Z",
                                sourceSize:
                                    100,
                                facilityId:
                                    "must-not-forward",
                                residentId:
                                    "must-not-forward"
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
                    "support.csv",
                    {
                        sourceDocumentKey:
                            "source-document-key",
                        sourceUpdatedAt:
                            "2026-09-15T10:00:00.000Z",
                        sourceSize:
                            100
                    }
                ]
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
            },
            {
                code:
                    "payload_too_large",
                expectedStatus:
                    413
            },
            {
                code:
                    "source_snapshot_invalid",
                expectedStatus:
                    422
            },
            {
                code:
                    "source_snapshot_changed",
                expectedStatus:
                    409
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
                                    sourceUpdatedAt:
                                        "2026-09-15T02:30:00.000Z",
                                    sourceSize:
                                        9520,

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
                        "血液型",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        9520
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
                                    sourceUpdatedAt:
                                        "2026-09-22T00:00:00.000Z",
                                    sourceSize:
                                        12345,
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
                                        "must-not-pass",
                                    confirmedByHuman:
                                        false
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
                    sourceUpdatedAt:
                        "2026-09-22T00:00:00.000Z",
                    sourceSize:
                        12345,
                    sourceFieldKey:
                        "sheet:0:column:3",
                    interpretationStatus:
                        "confirmed",
                    mappingStatus:
                        "no_standard_match",
                    confirmedMeaning:
                        null,
                    confirmedByHuman:
                        true
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

        let receivedSourceSnapshot = null;

        app.locals.getSourceFieldInterpretationIngestionService =
            async () => ({
                async list(sourceSnapshot) {
                    receivedSourceSnapshot =
                        sourceSnapshot;

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
                    `http://127.0.0.1:${address.port}/source-field-interpretations?sourceDocumentKey=document-key&sourceUpdatedAt=${encodeURIComponent("2026-09-22T00:00:00.000Z")}&sourceSize=12345`
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                receivedSourceSnapshot,
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-22T00:00:00.000Z",
                    sourceSize:
                        12345
                }
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
                        "現在の原本ファイル状態を確認できません"
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
    "POST /resident-candidates forwards only source snapshot identity to resolver",
    async () => {
        const originalFactory =
            app.locals.getResidentCandidateService;

        let received = null;

        app.locals.getResidentCandidateService =
            async () => ({
                async findCandidates(input) {
                    received = input;

                    return {
                        status: "matched",
                        candidates: [
                            {
                                residentId:
                                    "resident-test-1",
                                userCode:
                                    "U001",
                                name:
                                    "Test Resident",
                                kana:
                                    null,
                                birthDate:
                                    null
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
                    `http://127.0.0.1:${address.port}/resident-candidates`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sourceDocumentKey:
                                    "document-key",
                                sourceUpdatedAt:
                                    "2026-09-15T02:30:00.000Z",
                                sourceSize:
                                    9520,
                                sourceEntityKey:
                                    "sheet:0:row:2"
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                received,
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        9520,
                    sourceEntityKey:
                        "sheet:0:row:2"
                }
            );

            assert.deepStrictEqual(
                await response.json(),
                {
                    success: true,
                    status: "matched",
                    candidates: [
                        {
                            residentId:
                                "resident-test-1",
                            userCode:
                                "U001",
                            name:
                                "Test Resident",
                            kana:
                                null,
                            birthDate:
                                null
                        }
                    ]
                }
            );
        } finally {
            app.locals.getResidentCandidateService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "POST /resident-candidates rejects browser userCode facility or connector scope",
    async () => {
        const originalFactory =
            app.locals.getResidentCandidateService;

        let factoryCalled = false;

        app.locals.getResidentCandidateService =
            async () => {
                factoryCalled = true;

                return {
                    async findCandidates() {
                        throw new Error(
                            "must not be called"
                        );
                    }
                };
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

            for (const extraInput of [
                { userCode: "U001" },
                { facilityId: "must-not-pass" },
                { connectorId: "must-not-pass" }
            ]) {
                const response =
                    await fetch(
                        `http://127.0.0.1:${address.port}/resident-candidates`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    sourceDocumentKey:
                                        "document-key",
                                    sourceUpdatedAt:
                                        "2026-09-15T02:30:00.000Z",
                                    sourceSize:
                                        9520,
                                    sourceEntityKey:
                                        "sheet:0:row:2",
                                    ...extraInput
                                })
                        }
                    );

                assert.strictEqual(
                    response.status,
                    422
                );
            }

            assert.strictEqual(
                factoryCalled,
                false
            );
        } finally {
            app.locals.getResidentCandidateService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "POST /resident-candidates rejects invalid source snapshot before resolver lookup",
    async () => {
        const originalFactory =
            app.locals.getResidentCandidateService;

        let factoryCalled = false;

        app.locals.getResidentCandidateService =
            async () => {
                factoryCalled = true;

                return {
                    async findCandidates() {
                        throw new Error(
                            "must not be called"
                        );
                    }
                };
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
                    `http://127.0.0.1:${address.port}/resident-candidates`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sourceDocumentKey:
                                    "document-key",
                                sourceUpdatedAt:
                                    "not-a-date",
                                sourceSize:
                                    9520,
                                sourceEntityKey:
                                    "sheet:0:row:2"
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                422
            );

            assert.strictEqual(
                factoryCalled,
                false
            );
        } finally {
            app.locals.getResidentCandidateService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "GET source field mappings forwards only current source snapshot",
    async () => {
        const originalFactory =
            app.locals
                .getSourceFieldMappingIngestionService;

        let received = null;

        app.locals.getSourceFieldMappingIngestionService =
            async () => ({
                async list(
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                ) {
                    received = {
                        sourceDocumentKey,
                        sourceUpdatedAt,
                        sourceSize
                    };

                    return {
                        status: "found",
                        mappings: []
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

            const params =
                new URLSearchParams({
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "9520"
                });

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/source-field-mappings?${params}`
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                received,
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        9520
                }
            );
        } finally {
            app.locals.getSourceFieldMappingIngestionService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "GET source field mappings rejects invalid snapshot and browser scope",
    async () => {
        const originalFactory =
            app.locals
                .getSourceFieldMappingIngestionService;

        let serviceCalled = false;

        app.locals.getSourceFieldMappingIngestionService =
            async () => ({
                async list() {
                    serviceCalled = true;

                    return {
                        status: "found",
                        mappings: []
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

            const cases = [
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "not-a-timestamp",
                    sourceSize:
                        "9520"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "-1"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "1.5"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "9520",
                    facilityId:
                        "must-not-pass"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "9520",
                    connectorId:
                        "must-not-pass"
                }
            ];

            for (const query of cases) {
                const params =
                    new URLSearchParams(query);

                const response =
                    await fetch(
                        `http://127.0.0.1:${address.port}/source-field-mappings?${params}`
                    );

                assert.strictEqual(
                    response.status,
                    422
                );
            }

            assert.strictEqual(
                serviceCalled,
                false
            );
        } finally {
            app.locals.getSourceFieldMappingIngestionService =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "GET source resident links forwards only current source snapshot",
    async () => {
        const originalFactory =
            app.locals
                .getSourceResidentLinkClient;

        let received = null;

        app.locals.getSourceResidentLinkClient =
            async () => ({
                async list(input) {
                    received =
                        input;

                    return {
                        status:
                            "found",
                        links: []
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

            const params =
                new URLSearchParams({
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "9520"
                });

            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/source-resident-links?${params}`
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                received,
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        9520
                }
            );

            assert.deepStrictEqual(
                await response.json(),
                {
                    success:
                        true,
                    status:
                        "found",
                    links: []
                }
            );
        } finally {
            app.locals.getSourceResidentLinkClient =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "POST source resident links forwards exact human-reviewed link contract",
    async () => {
        const originalFactory =
            app.locals
                .getSourceResidentLinkClient;

        let received = null;

        app.locals.getSourceResidentLinkClient =
            async () => ({
                async save(input) {
                    received =
                        input;

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
                    `http://127.0.0.1:${address.port}/source-resident-links`,
                    {
                        method:
                            "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                sourceDocumentKey:
                                    "document-key",
                                sourceEntityKey:
                                    "sheet:0:row:2",
                                linkStatus:
                                    "confirmed",
                                residentId:
                                    "33333333-3333-3333-3333-333333333333",
                                sourceUpdatedAt:
                                    "2026-09-15T02:30:00.000Z",
                                sourceSize:
                                    9520
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                200
            );

            assert.deepStrictEqual(
                received,
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceEntityKey:
                        "sheet:0:row:2",
                    linkStatus:
                        "confirmed",
                    residentId:
                        "33333333-3333-3333-3333-333333333333",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        9520
                }
            );

            assert.deepStrictEqual(
                await response.json(),
                {
                    success:
                        true,
                    status:
                        "created"
                }
            );
        } finally {
            app.locals.getSourceResidentLinkClient =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "GET source resident links rejects invalid snapshot and browser-controlled scope",
    async () => {
        const originalFactory =
            app.locals
                .getSourceResidentLinkClient;

        let clientCalled = false;

        app.locals.getSourceResidentLinkClient =
            async () => ({
                async list() {
                    clientCalled =
                        true;

                    return {
                        status:
                            "found",
                        links: []
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

            const cases = [
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "not-a-date",
                    sourceSize:
                        "9520"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "-1"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "1.5"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "9520",
                    facilityId:
                        "must-not-pass"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "9520",
                    connectorId:
                        "must-not-pass"
                },
                {
                    sourceDocumentKey:
                        "document-key",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        "9520",
                    credential:
                        "must-not-pass"
                }
            ];

            for (const query of cases) {
                const params =
                    new URLSearchParams(query);

                const response =
                    await fetch(
                        `http://127.0.0.1:${address.port}/source-resident-links?${params}`
                    );

                assert.strictEqual(
                    response.status,
                    422
                );
            }

            assert.strictEqual(
                clientCalled,
                false
            );
        } finally {
            app.locals.getSourceResidentLinkClient =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test(
    "POST source resident links rejects transient status, invalid semantics, snapshot, and browser-controlled review scope",
    async () => {
        const originalFactory =
            app.locals
                .getSourceResidentLinkClient;

        let clientCalled = false;

        app.locals.getSourceResidentLinkClient =
            async () => ({
                async save() {
                    clientCalled =
                        true;

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

        const base = {
            sourceDocumentKey:
                "document-key",
            sourceEntityKey:
                "sheet:0:row:2",
            linkStatus:
                "confirmed",
            residentId:
                "33333333-3333-3333-3333-333333333333",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        };

        try {
            const address =
                server.address();

            const cases = [
                {
                    ...base,
                    linkStatus:
                        "matched"
                },
                {
                    ...base,
                    residentId:
                        null
                },
                {
                    ...base,
                    linkStatus:
                        "deferred",
                    residentId:
                        "33333333-3333-3333-3333-333333333333"
                },
                {
                    ...base,
                    linkStatus:
                        "no_match",
                    residentId:
                        "33333333-3333-3333-3333-333333333333"
                },
                {
                    ...base,
                    sourceUpdatedAt:
                        "not-a-date"
                },
                {
                    ...base,
                    sourceSize:
                        -1
                },
                {
                    ...base,
                    facilityId:
                        "must-not-pass"
                },
                {
                    ...base,
                    connectorId:
                        "must-not-pass"
                },
                {
                    ...base,
                    credential:
                        "must-not-pass"
                },
                {
                    ...base,
                    reviewedByHuman:
                        true
                },
                {
                    ...base,
                    reviewedAt:
                        "2026-09-15T03:00:00.000Z"
                }
            ];

            for (const body of cases) {
                const response =
                    await fetch(
                        `http://127.0.0.1:${address.port}/source-resident-links`,
                        {
                            method:
                                "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify(body)
                        }
                    );

                assert.strictEqual(
                    response.status,
                    422
                );
            }

            assert.strictEqual(
                clientCalled,
                false
            );
        } finally {
            app.locals.getSourceResidentLinkClient =
                originalFactory;

            await new Promise(
                resolve =>
                    server.close(resolve)
            );
        }
    }
);

test("GET /source-resident-mappings loads exact snapshot mappings", async () => {
    const original =
        app.locals.getSourceResidentMappingClient;

    let receivedInput = null;

    app.locals.getSourceResidentMappingClient =
        async () => ({
            async list(input) {
                receivedInput = input;

                return {
                    status: "found",
                    mappings: [
                        {
                            identifierType: "name",
                            identifierDigest:
                                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                            mappingStatus: "confirmed",
                            residentId:
                                "33333333-3333-3333-3333-333333333333"
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

        const params =
            new URLSearchParams({
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    "9520"
            });

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/source-resident-mappings?${params}`
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            200
        );

        assert.deepStrictEqual(
            receivedInput,
            {
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            }
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                status: "found",
                mappings: [
                    {
                        identifierType:
                            "name",
                        identifierDigest:
                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                        mappingStatus:
                            "confirmed",
                        residentId:
                            "33333333-3333-3333-3333-333333333333"
                    }
                ]
            }
        );
    } finally {
        app.locals.getSourceResidentMappingClient =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /source-resident-mappings saves exact identifier mapping contract", async () => {
    const original =
        app.locals.getSourceResidentMappingClient;

    let receivedInput = null;

    app.locals.getSourceResidentMappingClient =
        async () => ({
            async save(input) {
                receivedInput = input;

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

        const payload = {
            sourceDocumentKey:
                "document-1",
            identifierType:
                "name",
            identifierDigest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            mappingStatus:
                "confirmed",
            residentId:
                "33333333-3333-3333-3333-333333333333",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        };

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/source-resident-mappings`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            200
        );

        assert.deepStrictEqual(
            receivedInput,
            payload
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                status: "created"
            }
        );
    } finally {
        app.locals.getSourceResidentMappingClient =
            original;

        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});


test("POST /residents creates or reuses resident through trusted client", async () => {
    const original =
        app.locals.getResidentCreationClient;

    let received = null;

    app.locals.getResidentCreationClient =
        async () => ({
            async create(input) {
                received = input;

                return {
                    status: "created",
                    resident: {
                        residentId:
                            "resident-1",
                        userCode: null,
                        name:
                            "Test Resident",
                        kana: null,
                        birthDate: null
                    }
                };
            }
        });

    const server =
        app.listen(0, "127.0.0.1");

    try {
        await new Promise((resolve, reject) => {
            server.once("listening", resolve);
            server.once("error", reject);
        });

        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/residents`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            name:
                                " Test Resident "
                        })
                }
            );

        assert.strictEqual(
            response.status,
            200
        );

        assert.deepStrictEqual(
            received,
            {
                name:
                    "Test Resident"
            }
        );

        const body =
            await response.json();

        assert.strictEqual(
            body.success,
            true
        );

        assert.strictEqual(
            body.status,
            "created"
        );

        assert.strictEqual(
            body.resident.residentId,
            "resident-1"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getResidentCreationClient =
            original;
    }
});

test("POST /residents rejects extra fields and blank names before trusted client", async () => {
    const original =
        app.locals.getResidentCreationClient;

    let called = false;

    app.locals.getResidentCreationClient =
        async () => ({
            async create() {
                called = true;
            }
        });

    const server =
        app.listen(0, "127.0.0.1");

    try {
        await new Promise((resolve, reject) => {
            server.once("listening", resolve);
            server.once("error", reject);
        });

        const address =
            server.address();

        for (const body of [
            {
                name:
                    "Test Resident",
                facilityId:
                    "must-not-pass"
            },
            {
                name: " "
            }
        ]) {
            const response =
                await fetch(
                    `http://127.0.0.1:${address.port}/residents`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify(body)
                    }
                );

            assert.strictEqual(
                response.status,
                422
            );
        }

        assert.strictEqual(
            called,
            false
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getResidentCreationClient =
            original;
    }
});

test("POST /residents preserves safe same-name ambiguity", async () => {
    const original =
        app.locals.getResidentCreationClient;

    app.locals.getResidentCreationClient =
        async () => ({
            async create() {
                const error =
                    new Error("ambiguous");

                error.code =
                    "resident_name_ambiguous";

                throw error;
            }
        });

    const server =
        app.listen(0, "127.0.0.1");

    try {
        await new Promise((resolve, reject) => {
            server.once("listening", resolve);
            server.once("error", reject);
        });

        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/residents`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            name:
                                "Test Resident"
                        })
                }
            );

        assert.strictEqual(
            response.status,
            409
        );

        const body =
            await response.json();

        assert.strictEqual(
            body.errorCode,
            "resident_name_ambiguous"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getResidentCreationClient =
            original;
    }
});


test("POST /import-preview returns read-only preview result", async () => {
    const original =
        app.locals.getImportPreviewService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let received = null;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                assert.deepStrictEqual(
                    input,
                    {
                        sourceDocumentKey:
                            "doc-preview-1",
                        sourceUpdatedAt:
                            "2026-09-17T00:00:00.000Z",
                        sourceSize:
                            15089594
                    }
                );

                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "support_record",
                        confirmedAt:
                            "2026-09-17T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportPreviewService =
        async () => ({
            async preview(input) {
                received = input;

                return {
                    status: "blocked",
                    sourceEntityCount: 94198,
                    readySourceEntityCount: 100,
                    unresolvedResidentCount: 94098,
                    missingResidentNameCount: 0,
                    confirmedFieldMappingCount: 4,
                    sample: []
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-preview-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                15089594
                        })
                }
            );

        assert.strictEqual(
            response.status,
            200
        );

        assert.deepStrictEqual(
            received,
            {
                sourceDocumentKey:
                    "doc-preview-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    15089594
            }
        );

        const body =
            await response.json();

        assert.strictEqual(
            body.success,
            true
        );
        assert.strictEqual(
            body.status,
            "blocked"
        );
        assert.strictEqual(
            body.sourceEntityCount,
            94198
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportPreviewService =
            original;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});


test("POST /import-preview dispatches recipient certificate to dedicated preview service", async () => {
    const originalPreview =
        app.locals.getImportPreviewService;
    const originalRecipientCertificatePreview =
        app.locals.getRecipientCertificateImportPreviewService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let supportPreviewCalled = false;
    let certificatePreviewInput = null;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                assert.deepStrictEqual(
                    input,
                    {
                        sourceDocumentKey:
                            "doc-certificate-1",
                        sourceUpdatedAt:
                            "2026-09-21T00:00:00.000Z",
                        sourceSize:
                            12345
                    }
                );

                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "recipient_certificate",
                        confirmedAt:
                            "2026-09-21T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportPreviewService =
        async () => ({
            async preview() {
                supportPreviewCalled = true;
                throw new Error(
                    "support preview must not be called"
                );
            }
        });

    app.locals.getRecipientCertificateImportPreviewService =
        async () => ({
            async preview(input) {
                certificatePreviewInput = input;

                return {
                    status: "preview_only",
                    executionAvailable: false,
                    sourceEntityCount: 58,
                    residentSubjectCount: 58,
                    unavailableSourceEntityCount: 0,
                    summary: {
                        existingResidentCount: 0,
                        plannedNewResidentCount: 1,
                        excludedCount: 57,
                        deferredCount: 0,
                        undecidedCount: 0,
                        recipientCertificateCreateCount: 1
                    },
                    items: []
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-certificate-1",
                            sourceUpdatedAt:
                                "2026-09-21T00:00:00.000Z",
                            sourceSize:
                                12345
                        })
                }
            );

        assert.strictEqual(
            response.status,
            200
        );

        assert.strictEqual(
            supportPreviewCalled,
            false
        );

        assert.deepStrictEqual(
            certificatePreviewInput,
            {
                sourceDocumentKey:
                    "doc-certificate-1",
                sourceUpdatedAt:
                    "2026-09-21T00:00:00.000Z",
                sourceSize:
                    12345
            }
        );

        const body =
            await response.json();

        assert.strictEqual(
            body.success,
            true
        );
        assert.strictEqual(
            body.status,
            "preview_only"
        );
        assert.strictEqual(
            body.executionAvailable,
            false
        );
        assert.strictEqual(
            body.summary.plannedNewResidentCount,
            1
        );
        assert.strictEqual(
            body.summary.recipientCertificateCreateCount,
            1
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportPreviewService =
            originalPreview;
        app.locals.getRecipientCertificateImportPreviewService =
            originalRecipientCertificatePreview;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});


test("POST /import-preview dispatches requested recipient certificate semantic projection independently of source classification", async () => {
    const originalPreview =
        app.locals.getImportPreviewService;
    const originalRecipientCertificatePreview =
        app.locals.getRecipientCertificateImportPreviewService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let supportPreviewCalled = false;
    let certificatePreviewInput = null;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                assert.deepStrictEqual(
                    input,
                    {
                        sourceDocumentKey:
                            "doc-resident-master-1",
                        sourceUpdatedAt:
                            "2026-09-25T00:00:00.000Z",
                        sourceSize:
                            9520
                    }
                );

                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "resident_master",
                        confirmedAt:
                            "2026-09-25T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportPreviewService =
        async () => ({
            async preview() {
                supportPreviewCalled = true;
                throw new Error(
                    "support preview must not be called"
                );
            }
        });

    app.locals.getRecipientCertificateImportPreviewService =
        async () => ({
            async preview(input) {
                certificatePreviewInput = input;

                return {
                    status: "preview_only",
                    executionAvailable: false,
                    sourceEntityCount: 21,
                    residentSubjectCount: 21,
                    unavailableSourceEntityCount: 0,
                    summary: {
                        existingResidentCount: 0,
                        plannedNewResidentCount: 0,
                        excludedCount: 21,
                        deferredCount: 0,
                        undecidedCount: 0,
                        recipientCertificateCreateCount: 0
                    },
                    items: []
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-resident-master-1",
                            sourceUpdatedAt:
                                "2026-09-25T00:00:00.000Z",
                            sourceSize:
                                9520,
                            semanticType:
                                "recipient_certificate"
                        })
                }
            );

        assert.strictEqual(
            response.status,
            200
        );

        assert.strictEqual(
            supportPreviewCalled,
            false
        );

        assert.deepStrictEqual(
            certificatePreviewInput,
            {
                sourceDocumentKey:
                    "doc-resident-master-1",
                sourceUpdatedAt:
                    "2026-09-25T00:00:00.000Z",
                sourceSize:
                    9520
            }
        );

        const body =
            await response.json();

        assert.strictEqual(
            body.success,
            true
        );
        assert.strictEqual(
            body.semanticType,
            "recipient_certificate"
        );
        assert.strictEqual(
            body.status,
            "preview_only"
        );
        assert.strictEqual(
            body.executionAvailable,
            false
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportPreviewService =
            originalPreview;
        app.locals.getRecipientCertificateImportPreviewService =
            originalRecipientCertificatePreview;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});


test("POST /import-preview rejects unsupported explicit semantic projection before preview", async () => {
    const originalSupportPreview =
        app.locals.getImportPreviewService;
    const originalRecipientPreview =
        app.locals.getRecipientCertificateImportPreviewService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let supportPreviewCalled = false;
    let recipientPreviewCalled = false;
    let documentTypeLookupCalled = false;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get() {
                documentTypeLookupCalled = true;
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "resident_master",
                        confirmedAt:
                            "2026-09-25T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportPreviewService =
        async () => ({
            async preview() {
                supportPreviewCalled = true;
            }
        });

    app.locals.getRecipientCertificateImportPreviewService =
        async () => ({
            async preview() {
                recipientPreviewCalled = true;
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-resident-master-1",
                            sourceUpdatedAt:
                                "2026-09-25T00:00:00.000Z",
                            sourceSize:
                                9520,
                            semanticType:
                                "unknown_semantic_type"
                        })
                }
            );

        assert.strictEqual(
            response.status,
            422
        );

        assert.strictEqual(
            documentTypeLookupCalled,
            false
        );
        assert.strictEqual(
            supportPreviewCalled,
            false
        );
        assert.strictEqual(
            recipientPreviewCalled,
            false
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportPreviewService =
            originalSupportPreview;
        app.locals.getRecipientCertificateImportPreviewService =
            originalRecipientPreview;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-preview rejects an invalid request before preview", async () => {
    const original =
        app.locals.getImportPreviewService;

    let called = false;

    app.locals.getImportPreviewService =
        async () => ({
            async preview() {
                called = true;
                return {};
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-preview-1"
                        })
                }
            );

        assert.strictEqual(
            response.status,
            422
        );
        assert.strictEqual(
            called,
            false
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportPreviewService =
            original;
    }
});



test("POST /import-execute forwards only confirmed execution authority", async () => {
    const original =
        app.locals.getImportExecutionService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "support_record",
                        confirmedAt:
                            "2026-09-17T01:00:00.000Z"
                    }
                };
            }
        });

    let received = null;

    app.locals.getImportExecutionService =
        async () => ({
            async execute(input) {
                received = input;

                return {
                    status: "completed",
                    processed: 3,
                    created: 2,
                    updated: 1,
                    alreadyApplied: 0
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
        server.listen(0, "127.0.0.1", resolve)
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-execute-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                15089594,
                            expectedFingerprint:
                                "a".repeat(64)
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
            received,
            {
                sourceDocumentKey:
                    "doc-execute-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    15089594,
                expectedFingerprint:
                    "a".repeat(64)
            }
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                status: "completed",
                processed: 3,
                created: 2,
                updated: 1,
                alreadyApplied: 0
            }
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            original;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});


test("POST /import-execute dispatches recipient certificate only to dedicated execution service", async () => {
    const originalSupportExecution =
        app.locals.getImportExecutionService;
    const originalRecipientExecution =
        app.locals.getRecipientCertificateImportExecutionService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let supportExecutionCalled = false;
    let recipientReceived = null;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                assert.deepStrictEqual(
                    input,
                    {
                        sourceDocumentKey:
                            "doc-certificate-execute-1",
                        sourceUpdatedAt:
                            "2026-09-21T00:00:00.000Z",
                        sourceSize:
                            12345
                    }
                );

                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "recipient_certificate",
                        confirmedAt:
                            "2026-09-21T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                supportExecutionCalled = true;
                throw new Error(
                    "support execution service must not be called"
                );
            }
        });

    app.locals.getRecipientCertificateImportExecutionService =
        async () => ({
            async execute(input) {
                recipientReceived = input;

                return {
                    status: "completed",
                    processed: 2,
                    created: 1,
                    updated: 0,
                    unchanged: 1,
                    residentsCreated: 1
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-certificate-execute-1",
                            sourceUpdatedAt:
                                "2026-09-21T00:00:00.000Z",
                            sourceSize:
                                12345,
                            expectedFingerprint:
                                "a".repeat(64)
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            200
        );

        assert.strictEqual(
            supportExecutionCalled,
            false
        );

        assert.deepStrictEqual(
            recipientReceived,
            {
                sourceDocumentKey:
                    "doc-certificate-execute-1",
                sourceUpdatedAt:
                    "2026-09-21T00:00:00.000Z",
                sourceSize:
                    12345,
                expectedFingerprint:
                    "a".repeat(64)
            }
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                status: "completed",
                processed: 2,
                created: 1,
                updated: 0,
                unchanged: 1,
                residentsCreated: 1
            }
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            originalSupportExecution;
        app.locals.getRecipientCertificateImportExecutionService =
            originalRecipientExecution;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-execute dispatches requested recipient certificate semantic projection independently of source classification", async () => {
    const originalSupportExecution =
        app.locals.getImportExecutionService;
    const originalRecipientExecution =
        app.locals.getRecipientCertificateImportExecutionService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let supportExecutionCalled = false;
    let recipientReceived = null;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                assert.deepStrictEqual(
                    input,
                    {
                        sourceDocumentKey:
                            "doc-resident-master-execute-1",
                        sourceUpdatedAt:
                            "2026-09-25T00:00:00.000Z",
                        sourceSize:
                            23456
                    }
                );

                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "resident_master",
                        confirmedAt:
                            "2026-09-25T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                supportExecutionCalled = true;
                throw new Error(
                    "support execution service must not be called"
                );
            }
        });

    app.locals.getRecipientCertificateImportExecutionService =
        async () => ({
            async execute(input) {
                recipientReceived = input;

                return {
                    status: "completed",
                    processed: 2,
                    created: 1,
                    updated: 0,
                    unchanged: 1,
                    residentsCreated: 0
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-resident-master-execute-1",
                            sourceUpdatedAt:
                                "2026-09-25T00:00:00.000Z",
                            sourceSize:
                                23456,
                            expectedFingerprint:
                                "d".repeat(64),
                            semanticType:
                                "recipient_certificate"
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            200
        );

        assert.strictEqual(
            supportExecutionCalled,
            false
        );

        assert.deepStrictEqual(
            recipientReceived,
            {
                sourceDocumentKey:
                    "doc-resident-master-execute-1",
                sourceUpdatedAt:
                    "2026-09-25T00:00:00.000Z",
                sourceSize:
                    23456,
                expectedFingerprint:
                    "d".repeat(64)
            }
        );

        assert.deepStrictEqual(
            body,
            {
                success: true,
                status: "completed",
                processed: 2,
                created: 1,
                updated: 0,
                unchanged: 1,
                residentsCreated: 0
            }
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            originalSupportExecution;
        app.locals.getRecipientCertificateImportExecutionService =
            originalRecipientExecution;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-execute blocks unsupported document type before execution service", async () => {
    const originalSupportExecution =
        app.locals.getImportExecutionService;
    const originalRecipientExecution =
        app.locals.getRecipientCertificateImportExecutionService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let supportExecutionCalled = false;
    let recipientExecutionCalled = false;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get() {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "assessment",
                        confirmedAt:
                            "2026-09-21T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                supportExecutionCalled = true;
            }
        });

    app.locals.getRecipientCertificateImportExecutionService =
        async () => ({
            async execute() {
                recipientExecutionCalled = true;
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-assessment-execute-1",
                            sourceUpdatedAt:
                                "2026-09-21T00:00:00.000Z",
                            sourceSize:
                                12345,
                            expectedFingerprint:
                                "a".repeat(64)
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            409
        );
        assert.strictEqual(
            body.success,
            false
        );
        assert.strictEqual(
            body.status,
            "document_type_not_supported_for_execution"
        );
        assert.strictEqual(
            supportExecutionCalled,
            false
        );
        assert.strictEqual(
            recipientExecutionCalled,
            false
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            originalSupportExecution;
        app.locals.getRecipientCertificateImportExecutionService =
            originalRecipientExecution;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-execute rejects extra browser authority before execution", async () => {
    const original =
        app.locals.getImportExecutionService;

    let called = false;

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                called = true;
                return {};
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
        server.listen(0, "127.0.0.1", resolve)
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-execute-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                100,
                            expectedFingerprint:
                                "b".repeat(64),
                            operations: []
                        })
                }
            );

        assert.strictEqual(
            response.status,
            422
        );
        assert.strictEqual(
            called,
            false
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            original;
    }
});

test("POST /import-execute rejects invalid fingerprint before execution", async () => {
    const original =
        app.locals.getImportExecutionService;

    let called = false;

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                called = true;
                return {};
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
        server.listen(0, "127.0.0.1", resolve)
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-execute-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                100,
                            expectedFingerprint:
                                "not-a-fingerprint"
                        })
                }
            );

        assert.strictEqual(
            response.status,
            422
        );
        assert.strictEqual(
            called,
            false
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            original;
    }
});

test("POST /import-execute requires re-preview when execution is stale", async () => {
    const original =
        app.locals.getImportExecutionService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "support_record",
                        confirmedAt:
                            "2026-09-17T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                return {
                    status: "stale"
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
        server.listen(0, "127.0.0.1", resolve)
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-execute-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                100,
                            expectedFingerprint:
                                "c".repeat(64)
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            409
        );
        assert.strictEqual(
            body.success,
            false
        );
        assert.strictEqual(
            body.status,
            "stale"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            original;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-execute preserves conflict partial counts", async () => {
    const original =
        app.locals.getImportExecutionService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get(input) {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "support_record",
                        confirmedAt:
                            "2026-09-17T01:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                return {
                    status: "conflict",
                    sourceRecordKey:
                        "source-record-3",
                    processed: 2,
                    created: 1,
                    updated: 1,
                    alreadyApplied: 0
                };
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
        server.listen(0, "127.0.0.1", resolve)
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-execute-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                100,
                            expectedFingerprint:
                                "d".repeat(64)
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            409
        );

        assert.deepStrictEqual(
            {
                status:
                    body.status,
                sourceRecordKey:
                    body.sourceRecordKey,
                processed:
                    body.processed,
                created:
                    body.created,
                updated:
                    body.updated,
                alreadyApplied:
                    body.alreadyApplied
            },
            {
                status: "conflict",
                sourceRecordKey:
                    "source-record-3",
                processed: 2,
                created: 1,
                updated: 1,
                alreadyApplied: 0
            }
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            original;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-execute fails closed when execution result is unavailable", async () => {
    const original =
        app.locals.getImportExecutionService;

    app.locals.getImportExecutionService =
        async () => ({
            async execute() {
                throw new Error(
                    "unavailable"
                );
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
        server.listen(0, "127.0.0.1", resolve)
    );

    try {
        const address =
            server.address();

        const response =
            await fetch(
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-execute-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                100,
                            expectedFingerprint:
                                "e".repeat(64)
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );
        assert.strictEqual(
            body.success,
            false
        );
        assert.strictEqual(
            body.status,
            "error"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportExecutionService =
            original;
    }
});

test("POST /import-preview preserves unavailable processing as 503", async () => {
    const original =
        app.locals.getImportPreviewService;

    app.locals.getImportPreviewService =
        async () => ({
            async preview() {
                throw new Error(
                    "unavailable"
                );
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-preview-1",
                            sourceUpdatedAt:
                                "2026-09-17T00:00:00.000Z",
                            sourceSize:
                                100
                        })
                }
            );

        assert.strictEqual(
            response.status,
            503
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getImportPreviewService =
            original;
    }
});

test("GET /semantic-contracts/recipient-certificate exposes governed semantic targets", async () => {
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
                `http://127.0.0.1:${address.port}/semantic-contracts/recipient-certificate`
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
                semanticType:
                    "recipient_certificate",
                supportedSemanticTargets: [
                    "user.user_code",
                    "user.name",
                    "user.birth_date",
                    "user.gender",
                    "recipient_certificate.certificate_number",
                    "recipient_certificate.valid_until"
                ]
            }
        );
    } finally {
        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("GET /runtime-contract exposes the Local Connector runtime capability contract", async () => {
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
                `http://127.0.0.1:${address.port}/runtime-contract`
            );

        assert.strictEqual(
            response.status,
            200
        );

        const body =
            await response.json();

        assert.deepStrictEqual(
            body,
            {
                success: true,
                contractVersion:
                    "local-connector-runtime-v1",
                service:
                    "RISEN CARE Local Connector",
                capabilities: [
                    "recipient_certificate.semantic_contract",
                    "recipient_certificate.preview",
                    "recipient_certificate.fingerprint_execution"
                ]
            }
        );
    } finally {
        await new Promise(
            resolve =>
                server.close(resolve)
        );
    }
});

test("POST /import-preview fails closed when required recipient certificate preview runtime capability is unsupported", async () => {
    const originalRuntimeContract =
        app.locals.getLocalConnectorRuntimeContract;
    const originalRecipientCertificatePreview =
        app.locals.getRecipientCertificateImportPreviewService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let certificatePreviewCalled = false;

    app.locals.getLocalConnectorRuntimeContract =
        () => ({
            contractVersion:
                "local-connector-runtime-v1",
            service:
                "RISEN CARE Local Connector",
            capabilities: [
                "recipient_certificate.semantic_contract",
                "recipient_certificate.fingerprint_execution"
            ]
        });

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get() {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "recipient_certificate",
                        confirmedAt:
                            "2026-09-26T00:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getRecipientCertificateImportPreviewService =
        async () => ({
            async preview() {
                certificatePreviewCalled = true;
                throw new Error(
                    "recipient certificate preview must not be called"
                );
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-runtime-preview-gate",
                            sourceUpdatedAt:
                                "2026-09-26T00:00:00.000Z",
                            sourceSize:
                                12345
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );

        assert.strictEqual(
            certificatePreviewCalled,
            false
        );

        assert.strictEqual(
            body.success,
            false
        );

        assert.strictEqual(
            body.status,
            "capability_unsupported"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getLocalConnectorRuntimeContract =
            originalRuntimeContract;
        app.locals.getRecipientCertificateImportPreviewService =
            originalRecipientCertificatePreview;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-execute fails closed when required recipient certificate fingerprint execution runtime capability is unsupported", async () => {
    const originalRuntimeContract =
        app.locals.getLocalConnectorRuntimeContract;
    const originalRecipientExecution =
        app.locals.getRecipientCertificateImportExecutionService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let recipientExecutionCalled = false;

    app.locals.getLocalConnectorRuntimeContract =
        () => ({
            contractVersion:
                "local-connector-runtime-v1",
            service:
                "RISEN CARE Local Connector",
            capabilities: [
                "recipient_certificate.semantic_contract",
                "recipient_certificate.preview"
            ]
        });

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get() {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "recipient_certificate",
                        confirmedAt:
                            "2026-09-26T00:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getRecipientCertificateImportExecutionService =
        async () => ({
            async execute() {
                recipientExecutionCalled = true;

                throw new Error(
                    "recipient certificate execution must not be called"
                );
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-execute`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-runtime-execution-gate",
                            sourceUpdatedAt:
                                "2026-09-26T00:00:00.000Z",
                            sourceSize:
                                12345,
                            expectedFingerprint:
                                "a".repeat(64)
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );

        assert.strictEqual(
            recipientExecutionCalled,
            false
        );

        assert.strictEqual(
            body.success,
            false
        );

        assert.strictEqual(
            body.status,
            "capability_unsupported"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getLocalConnectorRuntimeContract =
            originalRuntimeContract;
        app.locals.getRecipientCertificateImportExecutionService =
            originalRecipientExecution;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-preview fails closed when runtime contract version is incompatible even if preview capability is declared", async () => {
    const originalRuntimeContract =
        app.locals.getLocalConnectorRuntimeContract;
    const originalRecipientCertificatePreview =
        app.locals.getRecipientCertificateImportPreviewService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let certificatePreviewCalled = false;

    app.locals.getLocalConnectorRuntimeContract =
        () => ({
            contractVersion:
                "local-connector-runtime-v999",
            service:
                "RISEN CARE Local Connector",
            capabilities: [
                "recipient_certificate.semantic_contract",
                "recipient_certificate.preview",
                "recipient_certificate.fingerprint_execution"
            ]
        });

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get() {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "recipient_certificate",
                        confirmedAt:
                            "2026-09-26T00:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getRecipientCertificateImportPreviewService =
        async () => ({
            async preview() {
                certificatePreviewCalled = true;

                throw new Error(
                    "incompatible runtime must not reach recipient certificate preview"
                );
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-incompatible-runtime-preview",
                            sourceUpdatedAt:
                                "2026-09-26T00:00:00.000Z",
                            sourceSize:
                                12345
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );

        assert.strictEqual(
            certificatePreviewCalled,
            false
        );

        assert.strictEqual(
            body.success,
            false
        );

        assert.strictEqual(
            body.status,
            "runtime_incompatible"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getLocalConnectorRuntimeContract =
            originalRuntimeContract;
        app.locals.getRecipientCertificateImportPreviewService =
            originalRecipientCertificatePreview;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});

test("POST /import-preview fails closed as runtime unavailable when runtime contract data is malformed", async () => {
    const originalRuntimeContract =
        app.locals.getLocalConnectorRuntimeContract;
    const originalRecipientCertificatePreview =
        app.locals.getRecipientCertificateImportPreviewService;
    const originalConfirmedDocumentTypeService =
        app.locals.getConfirmedDocumentTypeService;

    let certificatePreviewCalled = false;

    app.locals.getLocalConnectorRuntimeContract =
        () => ({
            contractVersion:
                "local-connector-runtime-v1",
            service:
                "RISEN CARE Local Connector",
            capabilities: null
        });

    app.locals.getConfirmedDocumentTypeService =
        async () => ({
            async get() {
                return {
                    status: "found",
                    confirmation: {
                        documentType:
                            "recipient_certificate",
                        confirmedAt:
                            "2026-09-26T00:00:00.000Z"
                    }
                };
            }
        });

    app.locals.getRecipientCertificateImportPreviewService =
        async () => ({
            async preview() {
                certificatePreviewCalled = true;

                throw new Error(
                    "malformed runtime contract must not reach recipient certificate preview"
                );
            }
        });

    const server =
        http.createServer(app);

    await new Promise(resolve =>
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
                `http://127.0.0.1:${address.port}/import-preview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            sourceDocumentKey:
                                "doc-malformed-runtime-preview",
                            sourceUpdatedAt:
                                "2026-09-26T00:00:00.000Z",
                            sourceSize:
                                12345
                        })
                }
            );

        const body =
            await response.json();

        assert.strictEqual(
            response.status,
            503
        );

        assert.strictEqual(
            certificatePreviewCalled,
            false
        );

        assert.strictEqual(
            body.success,
            false
        );

        assert.strictEqual(
            body.status,
            "runtime_unavailable"
        );
    } finally {
        await new Promise(resolve =>
            server.close(resolve)
        );

        app.locals.getLocalConnectorRuntimeContract =
            originalRuntimeContract;
        app.locals.getRecipientCertificateImportPreviewService =
            originalRecipientCertificatePreview;
        app.locals.getConfirmedDocumentTypeService =
            originalConfirmedDocumentTypeService;
    }
});
