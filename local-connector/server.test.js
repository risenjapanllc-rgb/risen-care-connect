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

    let analyzedFileName;

    service.normalizeRegisteredWord = async fileName => {
        analyzedFileName = fileName;

        return {
            documentType: "assessment",
            documentTypeConfidence: "high",
            source: {
                fileName: "assessment.docx",
                updatedAt: "2026-09-06T08:00:00.000Z"
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
            documentType: "assessment",
            documentTypeConfidence: "high",
            source: {
                fileName: "assessment.docx",
                updatedAt: "2026-09-06T08:00:00.000Z"
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
        await new Promise(resolve => server.close(resolve));
    }
});

test("POST /files/:fileName/analyze analyzes a registered Excel document", async () => {
    const service = app.locals.localConnectorService;
    const original = service.normalizeRegisteredExcel;

    let analyzedFileName;

    service.normalizeRegisteredExcel = async fileName => {
        analyzedFileName = fileName;

        return {
            documentType: "assessment",
            documentTypeConfidence: "medium",
            source: {
                fileName: "assessment.xlsx",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            extracted: {
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
            documentType: "assessment",
            documentTypeConfidence: "medium",
            source: {
                fileName: "assessment.xlsx",
                updatedAt: "2026-09-06T08:00:00.000Z"
            },
            extracted: {
                sourceResidentIdentifier: {
                    value: "resident-001",
                    sourceLabel: "利用者ID"
                }
            }
        });
    } finally {
        service.normalizeRegisteredExcel = original;
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
            message: "WordまたはExcelファイルのみ解析できます"
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
                return {
                    requestId:
                        "request-denied-001",
                    status:
                        "denied",
                    errorCode:
                        "connector_trust_denied"
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
                return {
                    requestId:
                        "request-invalid-001",
                    status:
                        "invalid",
                    errorCode:
                        "connector_payload_invalid"
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
                return {
                    requestId:
                        "request-error-001",
                    status:
                        "error",
                    errorCode:
                        "connector_processing_unavailable"
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
