"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("dotenv").config();

const {
    createServerTrustBoundaryHttpRuntime
} = require("../server-trust-boundary/httpRuntime");

async function withServer(app, fn) {
    const server =
        app.listen(0, "127.0.0.1");

    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });

    try {
        const address =
            server.address();

        const baseUrl =
            `http://127.0.0.1:${address.port}`;

        await fn(baseUrl);
    } finally {
        await new Promise((resolve) => {
            server.close(resolve);
        });
    }
}

test("live HTTP ingestion reaches verified resident lookup and returns unmatched", async () => {
    const connectorId =
        process.env.CONNECTOR_ID ||
        "f7d170fe-2591-43c1-920b-7014d3eb8a1d";

    const credential =
        process.env.CONNECTOR_CREDENTIAL;

    assert.ok(
        process.env.SUPABASE_URL
    );

    assert.ok(
        process.env.SUPABASE_PUBLISHABLE_KEY
    );

    assert.ok(
        process.env.SUPABASE_CONNECTOR_TRUST_EMAIL
    );

    assert.ok(
        process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD
    );

    assert.ok(connectorId);
    assert.ok(credential);

    const runtime =
        createServerTrustBoundaryHttpRuntime({
            supabaseUrl:
                process.env.SUPABASE_URL,
            apiKey:
                process.env.SUPABASE_PUBLISHABLE_KEY,
            connectorTrustEmail:
                process.env.SUPABASE_CONNECTOR_TRUST_EMAIL,
            connectorTrustPassword:
                process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD,
            authorizationScheme:
                "RISEN-Connector",
            connectorIdHeader:
                "x-risen-connector-id",
            endpointPath:
                "/connector/ingest",
            jsonBodyLimit:
                "100kb"
        });

    await withServer(
        runtime.app,
        async (baseUrl) => {
            const response =
                await fetch(
                    `${baseUrl}/connector/ingest`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            "X-RISEN-Connector-Id":
                                connectorId,
                            "Authorization":
                                `RISEN-Connector ${credential}`
                        },
                        body:
                            JSON.stringify({
                                sourceResident: {
                                    identifier: {
                                        value:
                                            "__connector_http_no_such_resident__"
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
                            })
                    }
                );

            assert.strictEqual(
                response.status,
                200
            );

            const body =
                await response.json();

            assert.deepStrictEqual(
                Object.keys(body).sort(),
                ["requestId", "status"]
            );

            assert.strictEqual(
                body.status,
                "unmatched"
            );

            assert.strictEqual(
                typeof body.requestId,
                "string"
            );
        }
    );
});
