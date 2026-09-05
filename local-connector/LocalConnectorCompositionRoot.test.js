"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const LocalConnectorCompositionRoot = require("./LocalConnectorCompositionRoot");

test("creates LocalConnectorService with persistent source document registry", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "risen-composition-root-"));
    const databasePath = path.join(tempDir, "registry.sqlite");
    const service = LocalConnectorCompositionRoot.createService({ databasePath });

    assert.ok(service.sourceDocumentRegistry);
    assert.strictEqual(typeof service.sourceDocumentRegistry.observe, "function");
});

test("resolves default database path when databasePath is omitted", () => {
    const previous = process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
    const databasePath = path.join(os.tmpdir(), "risen-composition-root-default.sqlite");
    process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = databasePath;

    try {
        const service = LocalConnectorCompositionRoot.createService();
        assert.ok(service.sourceDocumentRegistry);
    } finally {
        if (previous === undefined) {
            delete process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
        } else {
            process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = previous;
        }
    }
});
