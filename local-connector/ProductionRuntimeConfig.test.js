"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ProductionRuntimeConfig =
    require("./ProductionRuntimeConfig");

test(
    "production HTTPS endpoint is accepted",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "https://connector.example.test/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveServerTrustBoundaryEndpoint(),
            "https://connector.example.test/connector/ingest"
        );
    }
);

test(
    "localhost HTTP remains available for development",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    SERVER_TRUST_BOUNDARY_HOST:
                        "127.0.0.1",
                    SERVER_TRUST_BOUNDARY_PORT:
                        "8787",
                    SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveServerTrustBoundaryEndpoint(),
            "http://127.0.0.1:8787/connector/ingest"
        );
    }
);

test(
    "remote plaintext HTTP endpoint is rejected",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "http://stb.example.test/connector/ingest"
                }
            });

        assert.throws(
            () =>
                config
                    .resolveServerTrustBoundaryEndpoint(),
            /HTTPS/
        );
    }
);

test(
    "connector credential is required without exposing its value",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {}
            });

        assert.throws(
            () =>
                config
                    .requireConnectorCredential(),
            /CONNECTOR_CREDENTIAL/
        );
    }
);


test(
    "MySQL source is disabled when source id is absent",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {}
            });

        assert.strictEqual(
            config.resolveMySqlSource(),
            null
        );
    }
);

test(
    "MySQL production source requires complete configuration",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_MYSQL_SOURCE_ID:
                        "care-records",
                    RISEN_MYSQL_HOST:
                        "db.internal",
                    RISEN_MYSQL_USER:
                        "connector",
                    RISEN_MYSQL_PASSWORD:
                        "secret-for-test",
                    RISEN_MYSQL_DATABASE:
                        "care",
                    RISEN_MYSQL_QUERY:
                        "SELECT id FROM records"
                }
            });

        assert.deepStrictEqual(
            config.resolveMySqlSource(),
            {
                sourceId:
                    "care-records",
                host:
                    "db.internal",
                port:
                    3306,
                user:
                    "connector",
                password:
                    "secret-for-test",
                database:
                    "care",
                query:
                    "SELECT id FROM records"
            }
        );
    }
);

test(
    "MySQL production source rejects invalid port",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_MYSQL_SOURCE_ID:
                        "care-records",
                    RISEN_MYSQL_HOST:
                        "db.internal",
                    RISEN_MYSQL_PORT:
                        "not-a-port",
                    RISEN_MYSQL_USER:
                        "connector",
                    RISEN_MYSQL_PASSWORD:
                        "secret-for-test",
                    RISEN_MYSQL_DATABASE:
                        "care",
                    RISEN_MYSQL_QUERY:
                        "SELECT id FROM records"
                }
            });

        assert.throws(
            () =>
                config.resolveMySqlSource(),
            /RISEN_MYSQL_PORT/
        );
    }
);

test(
    "source document endpoint prefers dedicated endpoint",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SOURCE_DOCUMENT_ENDPOINT:
                        "https://connector.example.test/connector/source-documents",
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "https://connector.example.test/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveSourceDocumentEndpoint(),
            "https://connector.example.test/connector/source-documents"
        );
    }
);

test(
    "source document endpoint supports trust boundary specific endpoint",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SERVER_TRUST_BOUNDARY_SOURCE_DOCUMENT_ENDPOINT:
                        "https://connector.example.test/connector/source-documents",
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "https://connector.example.test/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveSourceDocumentEndpoint(),
            "https://connector.example.test/connector/source-documents"
        );
    }
);

test(
    "source document endpoint derives source route from semantic endpoint origin",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "https://connector.example.test/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveSourceDocumentEndpoint(),
            "https://connector.example.test/connector/source-documents"
        );
    }
);

test(
    "source document endpoint defaults to local trust boundary source route",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {}
            });

        assert.strictEqual(
            config.resolveSourceDocumentEndpoint(),
            "http://127.0.0.1:8787/connector/source-documents"
        );
    }
);


test(
    "source field mapping endpoint prefers dedicated endpoint",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SOURCE_FIELD_MAPPING_ENDPOINT:
                        "https://connector.example.test/connector/source-field-mappings",
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "https://connector.example.test/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveSourceFieldMappingEndpoint(),
            "https://connector.example.test/connector/source-field-mappings"
        );
    }
);

test(
    "source field mapping endpoint supports trust boundary specific endpoint",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SERVER_TRUST_BOUNDARY_SOURCE_FIELD_MAPPING_ENDPOINT:
                        "https://connector.example.test/connector/source-field-mappings",
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "https://connector.example.test/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveSourceFieldMappingEndpoint(),
            "https://connector.example.test/connector/source-field-mappings"
        );
    }
);

test(
    "source field mapping endpoint derives mapping route from semantic endpoint origin",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {
                    RISEN_SERVER_TRUST_BOUNDARY_ENDPOINT:
                        "https://connector.example.test/connector/ingest"
                }
            });

        assert.strictEqual(
            config.resolveSourceFieldMappingEndpoint(),
            "https://connector.example.test/connector/source-field-mappings"
        );
    }
);

test(
    "source field mapping endpoint defaults to local trust boundary mapping route",
    () => {
        const config =
            new ProductionRuntimeConfig({
                env: {}
            });

        assert.strictEqual(
            config.resolveSourceFieldMappingEndpoint(),
            "http://127.0.0.1:8787/connector/source-field-mappings"
        );
    }
);
