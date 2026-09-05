"use strict";
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const DatabasePathResolver = require("./DatabasePathResolver");

test("uses RISEN_LOCAL_CONNECTOR_DATABASE_PATH when configured", () => {
    const previous = process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
    process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = "/tmp/risen-custom/registry.sqlite";

    try {
        const resolver = new DatabasePathResolver();
        assert.strictEqual(
            resolver.resolve(),
            "/tmp/risen-custom/registry.sqlite"
        );
    } finally {
        if (previous === undefined) {
            delete process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
        } else {
            process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = previous;
        }
    }
});

test("uses macOS application support directory by default", () => {
    const previous = process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
    delete process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;

    try {
        const resolver = new DatabasePathResolver();
        const expected = path.join(
            os.homedir(),
            "Library",
            "Application Support",
            "RISEN CARE",
            "source-document-registry.sqlite"
        );
        assert.strictEqual(resolver.resolve(), expected);
    } finally {
        if (previous === undefined) {
            delete process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
        } else {
            process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = previous;
        }
    }
});

test("uses macOS application support directory when database path is blank", () => {
    const previous = process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
    process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = "   ";

    try {
        const resolver = new DatabasePathResolver();
        const expected = path.join(
            os.homedir(),
            "Library",
            "Application Support",
            "RISEN CARE",
            "source-document-registry.sqlite"
        );
        assert.strictEqual(resolver.resolve(), expected);
    } finally {
        if (previous === undefined) {
            delete process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
        } else {
            process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = previous;
        }
    }
});
