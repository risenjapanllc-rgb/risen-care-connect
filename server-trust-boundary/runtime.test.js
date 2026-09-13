"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createServerTrustBoundaryRuntime
} = require("./runtime");

const ServerTrustBoundaryIngestionService =
    require("./ServerTrustBoundaryIngestionService");

const SourceDocumentIngestionService =
    require("./SourceDocumentIngestionService");

const SourceFieldMappingIngestionService =
    require("./SourceFieldMappingIngestionService");


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

    assert.ok(
        runtime.sourceDocumentIngestionService
            instanceof SourceDocumentIngestionService
    );

    assert.ok(
        runtime.sourceFieldMappingIngestionService
            instanceof SourceFieldMappingIngestionService
    );

    assert.deepStrictEqual(
        Object.keys(runtime),
        [
            "serverTrustBoundaryIngestionService",
            "sourceDocumentIngestionService",
            "sourceFieldMappingIngestionService",
            "sourceFieldInterpretationIngestionService",
            "sourceFieldInterpretationQueryService"
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
