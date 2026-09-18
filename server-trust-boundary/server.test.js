"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    parsePort
} = require("./server");

test("parsePort accepts valid TCP ports", () => {
    assert.strictEqual(parsePort("1"), 1);
    assert.strictEqual(parsePort("8787"), 8787);
    assert.strictEqual(parsePort("65535"), 65535);
});

test("parsePort rejects invalid ports", () => {
    const invalidValues = [
        "0",
        "65536",
        "-1",
        "1.5",
        "abc",
        "",
        " "
    ];

    for (const value of invalidValues) {
        assert.throws(
            () => parsePort(value),
            /must be an integer from 1 to 65535/
        );
    }
});

const {
    resolveServerTrustBoundaryConfig,
    startServerTrustBoundary
} = require("./server");

function validEnv(overrides = {}) {
    return {
        SUPABASE_URL:
            "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY:
            "test-publishable-key",
        SUPABASE_CONNECTOR_TRUST_EMAIL:
            "connector@example.local",
        SUPABASE_CONNECTOR_TRUST_PASSWORD:
            "test-password",
        ...overrides
    };
}

test("default server configuration binds only to localhost", () => {
    const config =
        resolveServerTrustBoundaryConfig(
            validEnv()
        );

    assert.strictEqual(
        config.host,
        "127.0.0.1"
    );

    assert.strictEqual(
        config.port,
        8787
    );

    assert.strictEqual(
        config.endpointPath,
        "/connector/ingest"
    );
});

test("missing required trust configuration fails closed", () => {
    const env =
        validEnv();

    delete env.SUPABASE_CONNECTOR_TRUST_PASSWORD;

    assert.throws(
        () =>
            resolveServerTrustBoundaryConfig(
                env
            ),
        /Missing required environment variable/
    );
});

test("configuration failure occurs before runtime construction or listen", () => {
    let runtimeFactoryCalled =
        false;

    const env =
        validEnv();

    delete env.SUPABASE_URL;

    assert.throws(
        () =>
            startServerTrustBoundary({
                env,
                runtimeFactory() {
                    runtimeFactoryCalled =
                        true;

                    throw new Error(
                        "must not reach runtime factory"
                    );
                }
            }),
        /Missing required environment variable/
    );

    assert.strictEqual(
        runtimeFactoryCalled,
        false
    );
});

test("JSON body limit is explicit and configurable", () => {
    const defaultConfig =
        resolveServerTrustBoundaryConfig(
            validEnv()
        );

    assert.strictEqual(
        defaultConfig.jsonBodyLimit,
        "100kb"
    );

    assert.strictEqual(
        defaultConfig.sourceDocumentJsonBodyLimit,
        "25mb"
    );

    const customConfig =
        resolveServerTrustBoundaryConfig(
            validEnv({
                SERVER_TRUST_BOUNDARY_JSON_BODY_LIMIT:
                    "256kb",
                SERVER_TRUST_BOUNDARY_SOURCE_DOCUMENT_JSON_BODY_LIMIT:
                    "32mb"
            })
        );

    assert.strictEqual(
        customConfig.jsonBodyLimit,
        "256kb"
    );

    assert.strictEqual(
        customConfig.sourceDocumentJsonBodyLimit,
        "32mb"
    );
});
