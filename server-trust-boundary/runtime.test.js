"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createServerTrustBoundaryRuntime
} = require("./runtime");

const ConnectorIngestionService =
    require("./ConnectorIngestionService");

const SemanticIngestionService =
    require("../server-domain/storage/SemanticIngestionService");

test("creates complete Server Trust Boundary runtime", () => {
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
        runtime.connectorIngestionService
            instanceof ConnectorIngestionService
    );

    assert.ok(
        runtime.semanticIngestionService
            instanceof SemanticIngestionService
    );

    assert.deepStrictEqual(
        Object.keys(runtime),
        [
            "connectorIngestionService",
            "semanticIngestionService"
        ]
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
