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

    return new LocalConnectorIngestionService({
        localConnectorService,
        payloadBuilder,
        httpClient
    });
}

module.exports = {
    createService,
    createIngestionService
};
