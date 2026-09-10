"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createServerTrustBoundaryRuntime
} = require("./runtime");

const ServerTrustBoundaryIngestionService =
    require("./ServerTrustBoundaryIngestionService");

test("creates complete Server Trust Boundary application runtime", () => {
    const runtime =
        createServerTrustBoundaryRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password"
        });

    assert.ok(runtime);

    assert.ok(
        runtime.serverTrustBoundaryIngestionService
            instanceof ServerTrustBoundaryIngestionService
    );

    assert.deepStrictEqual(
        Object.keys(runtime),
        [
            "serverTrustBoundaryIngestionService"
        ]
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            runtime,
            "connectorIngestionService"
        ),
        false
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            runtime,
            "semanticIngestionService"
        ),
        false
    );
});

test("fails closed when Connector Trust auth configuration is missing", () => {
    assert.throws(
        () => createServerTrustBoundaryRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local"
        }),
        /requires password/
    );
});
