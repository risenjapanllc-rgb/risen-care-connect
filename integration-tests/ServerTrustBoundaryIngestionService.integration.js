"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("dotenv").config();

const {
    createServerTrustBoundaryRuntime
} = require("../server-trust-boundary/runtime");

test(
    "live application ingestion: trust -> verified facility -> resident lookup -> semantic pending review -> unmatched",
    async () => {
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
            await runtime
                .serverTrustBoundaryIngestionService
                .ingest({
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
                    },

                    semanticRecords: [{
                        sourceRecordContext: {
                            sourceRecordKey:
                                "support_record:primary"
                        },

                        semanticContent: {
                            semanticType:
                                "support_record",

                            fields: {
                                supportContent:
                                    "Application integration test"
                            },

                            customFields: {}
                        },

                        provenance: {
                            documentType:
                                "support_record",

                            sourceDocumentKey:
                                "application-integration-unmatched-document",

                            fileName:
                                "integration-test.docx",

                            sourceUpdatedAt:
                                "2026-09-05T10:00:00Z",

                            sourceType:
                                "word"
                        }
                    }]
                });

        assert.deepStrictEqual(
            result,
            {
                status: "unmatched",
                residentId: null,
                matchMethod: null,
                candidates: []
            }
        );
    }
);
