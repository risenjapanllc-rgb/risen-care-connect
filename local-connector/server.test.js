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
