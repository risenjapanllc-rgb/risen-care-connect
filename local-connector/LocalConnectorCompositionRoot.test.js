"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const LocalConnectorCompositionRoot = require("./LocalConnectorCompositionRoot");

test("creates LocalConnectorService with persistent source document registry", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "risen-composition-root-"));
    const databasePath = path.join(tempDir, "registry.sqlite");
    const service = LocalConnectorCompositionRoot.createService({ databasePath });

    assert.ok(service.sourceDocumentRegistry);
    assert.strictEqual(typeof service.sourceDocumentRegistry.observe, "function");
});

test("resolves default database path when databasePath is omitted", () => {
    const previous = process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
    const databasePath = path.join(os.tmpdir(), "risen-composition-root-default.sqlite");
    process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = databasePath;

    try {
        const service = LocalConnectorCompositionRoot.createService();
        assert.ok(service.sourceDocumentRegistry);
    } finally {
        if (previous === undefined) {
            delete process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;
        } else {
            process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH = previous;
        }
    }
});

test("creates ingestion service with explicit Server Trust Boundary configuration", async () => {
    const tempDir =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "risen-ingestion-root-"
            )
        );

    const databasePath =
        path.join(
            tempDir,
            "registry.sqlite"
        );

    const configPath =
        path.join(
            tempDir,
            ".local-connector-config.json"
        );

    fs.writeFileSync(
        configPath,
        JSON.stringify(
            {
                connectorId:
                    "11111111-2222-4333-8444-555555555555"
            },
            null,
            2
        )
    );

    try {
        const ingestionService =
            await LocalConnectorCompositionRoot
                .createIngestionService({
                    databasePath,
                    configPath,
                    endpoint:
                        "https://backend.example/connector/ingest",
                    credential:
                        "test-credential",
                    authorizationScheme:
                        "RISEN-Connector",
                    fetchImpl:
                        async () => ({
                            status: 200,
                            async json() {
                                return {
                                    requestId:
                                        "request-123",
                                    status:
                                        "unmatched"
                                };
                            }
                        })
                });

        assert.strictEqual(
            typeof ingestionService
                .ingestRegisteredFile,
            "function"
        );

        assert.strictEqual(
            ingestionService.httpClient.connectorId,
            "11111111-2222-4333-8444-555555555555"
        );

        assert.strictEqual(
            ingestionService.httpClient.endpoint,
            "https://backend.example/connector/ingest"
        );
    } finally {
        fs.rmSync(
            tempDir,
            {
                recursive: true,
                force: true
            }
        );
    }
});

test("ingestion composition does not require facilityId", async () => {
    const tempDir =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "risen-ingestion-no-facility-"
            )
        );

    const databasePath =
        path.join(
            tempDir,
            "registry.sqlite"
        );

    const configPath =
        path.join(
            tempDir,
            ".local-connector-config.json"
        );

    fs.writeFileSync(
        configPath,
        JSON.stringify(
            {
                connectorId:
                    "11111111-2222-4333-8444-555555555555"
            },
            null,
            2
        )
    );

    try {
        const ingestionService =
            await LocalConnectorCompositionRoot
                .createIngestionService({
                    databasePath,
                    configPath,
                    endpoint:
                        "https://backend.example/connector/ingest",
                    credential:
                        "test-credential",
                    authorizationScheme:
                        "RISEN-Connector",
                    fetchImpl:
                        async () => ({
                            status: 200,
                            async json() {
                                return {
                                    requestId:
                                        "request-456",
                                    status:
                                        "unmatched"
                                };
                            }
                        })
                });

        assert.ok(
            ingestionService
        );
    } finally {
        fs.rmSync(
            tempDir,
            {
                recursive: true,
                force: true
            }
        );
    }
});

test("creates semantic preparation service with persistent source document registry", () => {
    const tempDir =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "risen-semantic-preparation-root-"
            )
        );

    const databasePath =
        path.join(
            tempDir,
            "registry.sqlite"
        );

    const configPath =
        path.join(
            tempDir,
            ".local-connector-config.json"
        );

    fs.writeFileSync(
        configPath,
        JSON.stringify(
            {
                connectorId:
                    "11111111-2222-4333-8444-555555555555"
            },
            null,
            2
        )
    );

    try {
        const service =
            LocalConnectorCompositionRoot
                .createSemanticPreparationService({
                    databasePath,
                    configPath
                });

        assert.strictEqual(
            typeof service.prepareRegisteredFile,
            "function"
        );

        assert.ok(
            service.standardizationPipeline
                .localConnectorService
                .sourceDocumentRegistry
        );

        assert.strictEqual(
            typeof service.semanticRecordBuilder.build,
            "function"
        );
    } finally {
        fs.rmSync(
            tempDir,
            {
                recursive: true,
                force: true
            }
        );
    }
});

test(
    "creates source document ingestion service independently of semantic ingestion",
    async () => {
        const tempDir =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "risen-source-document-ingestion-root-"
                )
            );

        const databasePath =
            path.join(
                tempDir,
                "registry.sqlite"
            );

        const configPath =
            path.join(
                tempDir,
                ".local-connector-config.json"
            );

        fs.writeFileSync(
            configPath,
            JSON.stringify(
                {
                    connectorId:
                        "11111111-2222-4333-8444-555555555555"
                },
                null,
                2
            )
        );

        try {
            const ingestionService =
                await LocalConnectorCompositionRoot
                    .createSourceDocumentIngestionService({
                        databasePath,
                        configPath,
                        endpoint:
                            "https://backend.example/connector/source-documents",
                        credential:
                            "test-credential",
                        authorizationScheme:
                            "RISEN-Connector",
                        fetchImpl:
                            async () => ({
                                ok: true,
                                status: 200,
                                async json() {
                                    return {
                                        status:
                                            "created"
                                    };
                                }
                            })
                    });

            assert.strictEqual(
                typeof ingestionService
                    .ingestRegisteredFile,
                "function"
            );

            assert.strictEqual(
                ingestionService
                    .httpClient
                    .connectorId,
                "11111111-2222-4333-8444-555555555555"
            );

            assert.strictEqual(
                ingestionService
                    .httpClient
                    .endpoint,
                "https://backend.example/connector/source-documents"
            );

            assert.strictEqual(
                typeof ingestionService
                    .sourceAdapter
                    .acquireRaw,
                "function"
            );
        } finally {
            fs.rmSync(
                tempDir,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);


test(
    "creates source document sync engine with independent raw sync state",
    async () => {
        const fs =
            require("node:fs");
        const os =
            require("node:os");
        const path =
            require("node:path");

        const directory =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "risen-source-sync-root-"
                )
            );

        const databasePath =
            path.join(
                directory,
                "connector.sqlite"
            );

        const configPath =
            path.join(
                directory,
                "connector-config.json"
            );

        fs.writeFileSync(
            configPath,
            JSON.stringify({
                connectorId:
                    "11111111-1111-4111-8111-111111111111"
            })
        );

        try {
            const engine =
                await LocalConnectorCompositionRoot
                    .createSourceDocumentSyncEngine({
                        databasePath,
                        configPath,
                        endpoint:
                            "https://backend.example/connector/source-documents",
                        credential:
                            "test-credential",
                        authorizationScheme:
                            "RISEN-Connector",
                        fetchImpl:
                            async () => {
                                throw new Error(
                                    "network should not be called during composition"
                                );
                            }
                    });

            assert.strictEqual(
                typeof engine.syncOnce,
                "function"
            );

            assert.strictEqual(
                engine.ingestionService
                    .constructor.name,
                "LocalSourceDocumentIngestionService"
            );

            assert.strictEqual(
                engine.syncStateStore
                    .constructor.name,
                "SqliteSourceDocumentSyncStateStore"
            );
        } finally {
            fs.rmSync(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);


test(
    "creates source field mapping ingestion client with local connector identity",
    async () => {
        const tempDir =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "risen-source-field-mapping-root-"
                )
            );

        const databasePath =
            path.join(
                tempDir,
                "registry.sqlite"
            );

        const configPath =
            path.join(
                tempDir,
                ".local-connector-config.json"
            );

        fs.writeFileSync(
            configPath,
            JSON.stringify({
                connectorId:
                    "11111111-2222-4333-8444-555555555555"
            })
        );

        try {
            const client =
                await LocalConnectorCompositionRoot
                    .createSourceFieldMappingIngestionService({
                        databasePath,
                        configPath,
                        endpoint:
                            "https://backend.example/connector/source-field-mappings",
                        credential:
                            "test-credential",
                        authorizationScheme:
                            "RISEN-Connector",
                        fetchImpl:
                            async () => {
                                throw new Error(
                                    "network should not be called during composition"
                                );
                            }
                    });

            assert.strictEqual(
                typeof client.ingest,
                "function"
            );

            assert.strictEqual(
                client.connectorId,
                "11111111-2222-4333-8444-555555555555"
            );

            assert.strictEqual(
                client.endpoint,
                "https://backend.example/connector/source-field-mappings"
            );
        } finally {
            fs.rmSync(
                tempDir,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);


test("creates source field interpretation ingestion client from local connector identity", async () => {
    const tempDir =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "risen-source-field-interpretation-root-"
            )
        );

    const databasePath =
        path.join(
            tempDir,
            "registry.sqlite"
        );

    const configPath =
        path.join(
            tempDir,
            ".local-connector-config.json"
        );

    fs.writeFileSync(
        configPath,
        JSON.stringify({
            connectorId:
                "11111111-2222-4333-8444-555555555555"
        })
    );

    try {
        const client =
            await LocalConnectorCompositionRoot
                .createSourceFieldInterpretationIngestionService({
                    databasePath,
                    configPath,
                    endpoint:
                        "https://backend.example/connector/source-field-interpretations",
                    credential:
                        "test-credential",
                    authorizationScheme:
                        "RISEN-Connector",
                    fetchImpl:
                        async () => {
                            throw new Error(
                                "network should not be called during composition"
                            );
                        }
                });

        assert.strictEqual(
            typeof client.ingest,
            "function"
        );

        assert.strictEqual(
            client.connectorId,
            "11111111-2222-4333-8444-555555555555"
        );

        assert.strictEqual(
            client.endpoint,
            "https://backend.example/connector/source-field-interpretations"
        );
    } finally {
        fs.rmSync(
            tempDir,
            {
                recursive: true,
                force: true
            }
        );
    }
});
