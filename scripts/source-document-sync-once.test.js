"use strict";

const assert =
    require("node:assert/strict");
const test =
    require("node:test");

const {
    syncSourceDocuments
} = require(
    "./source-document-sync-once"
);

test(
    "source document sync uses dedicated raw sync engine and optional relative path",
    async () => {
        const calls = [];

        const runtimeConfig = {
            resolveSourceDocumentEndpoint() {
                return "https://connector.example.test/connector/source-documents";
            },

            requireConnectorCredential() {
                return "test-credential";
            },

            resolveAuthorizationScheme() {
                return "RISEN-Connector";
            },

            resolveConnectorIdHeader() {
                return "x-risen-connector-id";
            }
        };

        const result =
            await syncSourceDocuments({
                runtimeConfig,
                databasePath:
                    "/tmp/test-connector.sqlite",
                relativePath:
                    "records/source.csv",
                createSourceDocumentSyncEngine:
                    async options => {
                        calls.push({
                            type:
                                "create",
                            options
                        });

                        return {
                            async syncOnce(options) {
                                calls.push({
                                    type:
                                        "sync",
                                    options
                                });

                                return {
                                    status:
                                        "completed",
                                    scanned:
                                        1,
                                    attempted:
                                        1,
                                    succeeded:
                                        1,
                                    failed:
                                        0,
                                    skipped:
                                        0
                                };
                            }
                        };
                    }
            });

        assert.deepStrictEqual(
            calls,
            [
                {
                    type:
                        "create",
                    options: {
                        databasePath:
                            "/tmp/test-connector.sqlite",
                        endpoint:
                            "https://connector.example.test/connector/source-documents",
                        credential:
                            "test-credential",
                        authorizationScheme:
                            "RISEN-Connector",
                        connectorIdHeader:
                            "x-risen-connector-id"
                    }
                },
                {
                    type:
                        "sync",
                    options: {
                        relativePaths: [
                            "records/source.csv"
                        ]
                    }
                }
            ]
        );

        assert.strictEqual(
            result.status,
            "completed"
        );

        assert.strictEqual(
            result.failed,
            0
        );
    }
);
