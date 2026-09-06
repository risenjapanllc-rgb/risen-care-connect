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
