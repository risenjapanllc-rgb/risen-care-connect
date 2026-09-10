"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createServerTrustBoundaryHttpRuntime
} = require("./httpRuntime");

test("creates complete Server Trust Boundary HTTP runtime", () => {
    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb"
        });

    assert.ok(runtime);
    assert.ok(runtime.app);

    assert.deepStrictEqual(
        Object.keys(runtime),
        ["app"]
    );
});

test("requires explicit HTTP transport configuration", () => {
    assert.throws(
        () => createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-publishable-key",
            connectorTrustEmail:
                "connector@example.local",
            connectorTrustPassword:
                "test-password"
        }),
        /requires authorizationScheme/
    );
});

test("accepts diagnostic logger without exposing it from runtime", () => {
    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "publishable-key",
            connectorTrustEmail:
                "trust@example.local",
            connectorTrustPassword:
                "password",
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb",
            diagnosticLogger: {
                error() {}
            }
        });

    assert.deepStrictEqual(
        Object.keys(runtime),
        ["app"]
    );

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            runtime,
            "diagnosticLogger"
        ),
        false
    );
});
