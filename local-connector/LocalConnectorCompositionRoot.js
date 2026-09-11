"use strict";

const LocalConnectorService =
    require("./LocalConnectorService");
const LocalConnectorConfig =
    require("./LocalConnectorConfig");
const SourceDocumentRegistry =
    require("./SourceDocumentRegistry");
const SourceDocumentKeyGenerator =
    require("./SourceDocumentKeyGenerator");
const RelativePathLookupKeyBuilder =
    require("./RelativePathLookupKeyBuilder");
const SqliteSourceDocumentRegistryStore =
    require("./SqliteSourceDocumentRegistryStore");
const DatabasePathResolver =
    require("./DatabasePathResolver");

const ConnectorIngestionPayloadBuilder =
    require("./ConnectorIngestionPayloadBuilder");
const ServerTrustBoundaryHttpClient =
    require("./ServerTrustBoundaryHttpClient");
const LocalConnectorIngestionService =
    require("./LocalConnectorIngestionService");
const SemanticRecordBuilder =
    require("./SemanticRecordBuilder");
const LocalSemanticRecordPreparationService =
    require("./LocalSemanticRecordPreparationService");
const SqliteSyncStateStore =
    require("./SqliteSyncStateStore");
const LocalConnectorSyncEngine =
    require("./LocalConnectorSyncEngine");
const LocalConnectorStandardizationPipeline =
    require("./LocalConnectorStandardizationPipeline");

function createService({
    databasePath,
    configPath
} = {}) {
    const resolvedDatabasePath =
        typeof databasePath === "string" &&
        databasePath.trim() !== ""
            ? databasePath.trim()
            : new DatabasePathResolver().resolve();

    const registryStore =
        new SqliteSourceDocumentRegistryStore({
            databasePath:
                resolvedDatabasePath
        });

    const sourceDocumentRegistry =
        new SourceDocumentRegistry({
            sourceDocumentKeyGenerator:
                new SourceDocumentKeyGenerator(),
            registryStore,
            relativePathLookupKeyBuilder:
                new RelativePathLookupKeyBuilder()
        });

    const config =
        new LocalConnectorConfig({
            ...(configPath
                ? { configPath }
                : {})
        });

    return new LocalConnectorService({
        config,
        sourceDocumentRegistry
    });
}

function createSemanticPreparationService({
    databasePath,
    configPath
} = {}) {
    const localConnectorService =
        createService({
            databasePath,
            configPath
        });

    const semanticRecordBuilder =
        new SemanticRecordBuilder();

    const standardizationPipeline =
        new LocalConnectorStandardizationPipeline({
            localConnectorService
        });

    return new LocalSemanticRecordPreparationService({
        localConnectorService,
        standardizationPipeline,
        semanticRecordBuilder
    });
}

async function createIngestionService({
    databasePath,
    configPath,
    endpoint,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    fetchImpl = globalThis.fetch
} = {}) {
    const localConnectorService =
        createService({
            databasePath,
            configPath
        });

    const connectorId =
        await localConnectorService
            .getConnectorId();

    const payloadBuilder =
        new ConnectorIngestionPayloadBuilder();

    const httpClient =
        new ServerTrustBoundaryHttpClient({
            endpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl
        });

    const semanticRecordBuilder =
        new SemanticRecordBuilder();

    const standardizationPipeline =
        new LocalConnectorStandardizationPipeline({
            localConnectorService
        });

    return new LocalConnectorIngestionService({
        localConnectorService,
        standardizationPipeline,
        payloadBuilder,
        semanticRecordBuilder,
        httpClient
    });
}

async function createSyncEngine({
    databasePath,
    configPath,
    endpoint,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    fetchImpl = globalThis.fetch,
    clock,
    baseRetryMs,
    maxRetryMs
} = {}) {
    const resolvedDatabasePath =
        typeof databasePath === "string" &&
        databasePath.trim() !== ""
            ? databasePath.trim()
            : new DatabasePathResolver().resolve();

    const localConnectorService =
        createService({
            databasePath:
                resolvedDatabasePath,
            configPath
        });

    const connectorId =
        await localConnectorService
            .getConnectorId();

    const standardizationPipeline =
        new LocalConnectorStandardizationPipeline({
            localConnectorService
        });

    const ingestionService =
        new LocalConnectorIngestionService({
            localConnectorService,
            standardizationPipeline,
            payloadBuilder:
                new ConnectorIngestionPayloadBuilder(),
            semanticRecordBuilder:
                new SemanticRecordBuilder(),
            httpClient:
                new ServerTrustBoundaryHttpClient({
                    endpoint,
                    connectorId,
                    credential,
                    authorizationScheme,
                    connectorIdHeader,
                    fetchImpl
                })
        });

    const syncStateStore =
        new SqliteSyncStateStore({
            databasePath:
                resolvedDatabasePath
        });

    return new LocalConnectorSyncEngine({
        localConnectorService,
        ingestionService,
        syncStateStore,
        ...(clock
            ? { clock }
            : {}),
        ...(Number.isFinite(baseRetryMs)
            ? { baseRetryMs }
            : {}),
        ...(Number.isFinite(maxRetryMs)
            ? { maxRetryMs }
            : {})
    });
}

module.exports = {
    createService,
    createSemanticPreparationService,
    createIngestionService,
    createSyncEngine
};
