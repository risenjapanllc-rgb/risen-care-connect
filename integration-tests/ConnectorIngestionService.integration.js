"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("dotenv").config();

const {
    createServerTrustBoundaryRuntime
} = require("../server-trust-boundary/runtime");

test("live ingestion: trust -> verified facility -> resident lookup -> unmatched", async () => {
    const runtime =
        createServerTrustBoundaryRuntime({
            supabaseUrl:
                process.env.SUPABASE_URL,
            apiKey:
                process.env.SUPABASE_PUBLISHABLE_KEY,
            connectorTrustEmail:
                process.env.SUPABASE_CONNECTOR_TRUST_EMAIL,
            connectorTrustPassword:
                process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD
        });

    const connectorId =
        process.env.CONNECTOR_ID ||
        "f7d170fe-2591-43c1-920b-7014d3eb8a1d";

    const credential =
        process.env.CONNECTOR_CREDENTIAL;

    assert.ok(connectorId);
    assert.ok(credential);

    const result =
        await runtime.connectorIngestionService.ingest({
            connectorId,
            credential,
            payload: {
                sourceResident: {
                    identifier: {
                        value:
                            "__connector_trust_boundary_no_such_resident__"
                    }
                },
                source: {
                    fileName:
                        "integration-test.docx",
                    updatedAt:
                        "2026-09-05T10:00:00Z"
                },
                documentType:
                    "support_record",
                sourceType:
                    "word"
            }
        });

    assert.deepStrictEqual(result, {
        status: "unmatched",
        residentId: null,
        matchMethod: null,
        candidates: []
    });
});
