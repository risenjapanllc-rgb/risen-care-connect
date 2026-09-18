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
const SqliteSourceDocumentSyncStateStore =
    require("./SqliteSourceDocumentSyncStateStore");
const LocalConnectorSyncEngine =
    require("./LocalConnectorSyncEngine");
const LocalConnectorStandardizationPipeline =
    require("./LocalConnectorStandardizationPipeline");
const SourceDocumentHttpClient =
    require("./SourceDocumentHttpClient");

const SourceFieldMappingHttpClient =
    require("./SourceFieldMappingHttpClient");

const SourceFieldInterpretationHttpClient =
    require("./SourceFieldInterpretationHttpClient");

const ConnectorResidentCandidateHttpClient =
    require("./ConnectorResidentCandidateHttpClient");

const SourceResidentLinkHttpClient =
    require("./SourceResidentLinkHttpClient");

const SourceResidentMappingHttpClient =
    require("./SourceResidentMappingHttpClient");
const SourceRecordIdentityMappingHttpClient =
    require("./SourceRecordIdentityMappingHttpClient");
const SourceRecordIdentityValidator =
    require("./SourceRecordIdentityValidator");
const SourceRecordIdentityConfirmationService =
    require("./SourceRecordIdentityConfirmationService");
const SourceRecordIdentityPersistenceService =
    require("./SourceRecordIdentityPersistenceService");
const ResidentCreationHttpClient =
    require("./ResidentCreationHttpClient");
const SourceResidentCandidateResolver =
    require("./SourceResidentCandidateResolver");
const LocalImportPreviewService =
    require("./LocalImportPreviewService");
const ConnectorSupportRecordRowBuilder =
    require("./ConnectorSupportRecordRowBuilder");
const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");
const ConnectorSemanticRecordPreviewHttpClient =
    require("./ConnectorSemanticRecordPreviewHttpClient");
const ConnectorSupportRecordBatchWriteHttpClient =
    require("./ConnectorSupportRecordBatchWriteHttpClient");
const ConnectorSupportRecordExecutionGate =
    require("./ConnectorSupportRecordExecutionGate");
const ConnectorSupportRecordExecutionService =
    require("./ConnectorSupportRecordExecutionService");
const LocalImportExecutionService =
    require("./LocalImportExecutionService");

const RegisteredFileSourceAdapter =
    require("./RegisteredFileSourceAdapter");
const LocalSourceDocumentIngestionService =
    require("./LocalSourceDocumentIngestionService");

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

async function createSourceDocumentIngestionService({
    databasePath,
    configPath,
    endpoint,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    fetchImpl = globalThis.fetch,
    timeoutMs,
    clock
} = {}) {
    const localConnectorService =
        createService({
            databasePath,
            configPath
        });

    const connectorId =
        await localConnectorService
            .getConnectorId();

    const sourceAdapter =
        new RegisteredFileSourceAdapter({
            localConnectorService
        });

    const httpClient =
        new SourceDocumentHttpClient({
            endpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl,
            ...(Number.isFinite(timeoutMs)
                ? { timeoutMs }
                : {})
        });

    return new LocalSourceDocumentIngestionService({
        sourceAdapter,
        httpClient,
        ...(clock
            ? { clock }
            : {})
    });
}

async function createSourceFieldMappingIngestionService({
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

    return new SourceFieldMappingHttpClient({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader,
        fetchImpl
    });
}

async function createSourceFieldInterpretationIngestionService({
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

    return new SourceFieldInterpretationHttpClient({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader,
        fetchImpl
    });
}

async function createResidentCandidateService({
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

    return new ConnectorResidentCandidateHttpClient({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader,
        fetchImpl
    });
}

async function createSourceResidentCandidateResolver({
    databasePath,
    configPath,
    mappingEndpoint,
    candidateEndpoint,
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

    const sourceFieldMappingClient =
        new SourceFieldMappingHttpClient({
            endpoint:
                mappingEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl
        });

    const residentCandidateClient =
        new ConnectorResidentCandidateHttpClient({
            endpoint:
                candidateEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl
        });

    return new SourceResidentCandidateResolver({
        localConnectorService,
        sourceFieldMappingClient,
        residentCandidateClient
    });
}

async function createImportPreviewService({
    databasePath,
    configPath,
    fieldMappingEndpoint,
    residentMappingEndpoint,
    sourceRecordIdentityMappingEndpoint,
    semanticRecordPreviewEndpoint,
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

    const sourceFieldMappingClient =
        new SourceFieldMappingHttpClient({
            endpoint:
                fieldMappingEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const sourceResidentMappingClient =
        new SourceResidentMappingHttpClient({
            endpoint:
                residentMappingEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const sourceRecordIdentityMappingClient =
        new SourceRecordIdentityMappingHttpClient({
            endpoint:
                sourceRecordIdentityMappingEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const semanticRecordPreviewClient =
        new ConnectorSemanticRecordPreviewHttpClient({
            endpoint:
                semanticRecordPreviewEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    return new LocalImportPreviewService({
        localConnectorService,
        sourceFieldMappingClient,
        sourceResidentMappingClient,
        sourceRecordIdentityMappingClient,
        semanticRecordPreviewClient,
        rowBuilder:
            new ConnectorSupportRecordRowBuilder(),
        canonicalizer:
            new ConnectorSupportRecordCanonicalizer()
    });
}

async function createImportExecutionService({
    databasePath,
    configPath,
    fieldMappingEndpoint,
    residentMappingEndpoint,
    sourceRecordIdentityMappingEndpoint,
    semanticRecordPreviewEndpoint,
    supportRecordBatchWriteEndpoint,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    fetchImpl = globalThis.fetch
} = {}) {
    const importPreviewService =
        await createImportPreviewService({
            databasePath,
            configPath,
            fieldMappingEndpoint,
            residentMappingEndpoint,
            sourceRecordIdentityMappingEndpoint,
            semanticRecordPreviewEndpoint,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl
        });

    const localConnectorService =
        createService({
            databasePath,
            configPath
        });

    const connectorId =
        await localConnectorService
            .getConnectorId();

    const semanticRecordPreviewClient =
        new ConnectorSemanticRecordPreviewHttpClient({
            endpoint:
                semanticRecordPreviewEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const batchWriteClient =
        new ConnectorSupportRecordBatchWriteHttpClient({
            endpoint:
                supportRecordBatchWriteEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            maxBatchSize: 100,
            fetchImpl
        });

    const executionGate =
        new ConnectorSupportRecordExecutionGate({
            importPreviewService
        });

    const executionService =
        new ConnectorSupportRecordExecutionService({
            semanticRecordPreviewClient,
            batchWriteClient,
            writeBatchSize: 100
        });

    return new LocalImportExecutionService({
        executionGate,
        executionService
    });
}

async function createSourceResidentLinkClient({
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

    return new SourceResidentLinkHttpClient({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader,
        fetchImpl
    });
}

async function createSourceResidentMappingClient({
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

    return new SourceResidentMappingHttpClient({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader,
        fetchImpl
    });
}

async function createSourceRecordIdentityMappingService({
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

    const sourceRecordIdentityMappingClient =
        new SourceRecordIdentityMappingHttpClient({
            endpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const confirmationService =
        new SourceRecordIdentityConfirmationService({
            localConnectorService,
            validator:
                new SourceRecordIdentityValidator()
        });

    const persistenceService =
        new SourceRecordIdentityPersistenceService({
            confirmationService,
            sourceRecordIdentityMappingClient
        });

    return {
        confirm:
            input =>
                persistenceService.confirm(input),
        get:
            input =>
                sourceRecordIdentityMappingClient.get(input)
    };
}

async function createResidentCreationClient({
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

    return new ResidentCreationHttpClient({
        endpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader,
        fetchImpl
    });
}

async function createSourceDocumentSyncEngine({
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
            : new DatabasePathResolver()
                .resolve();

    const localConnectorService =
        createService({
            databasePath:
                resolvedDatabasePath,
            configPath
        });

    const connectorId =
        await localConnectorService
            .getConnectorId();

    const sourceAdapter =
        new RegisteredFileSourceAdapter({
            localConnectorService
        });

    const ingestionService =
        new LocalSourceDocumentIngestionService({
            sourceAdapter,
            httpClient:
                new SourceDocumentHttpClient({
                    endpoint,
                    connectorId,
                    credential,
                    authorizationScheme,
                    connectorIdHeader,
                    fetchImpl
                }),
            ...(clock
                ? { clock }
                : {})
        });

    const syncStateStore =
        new SqliteSourceDocumentSyncStateStore({
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
    createSourceDocumentIngestionService,
    createSourceFieldMappingIngestionService,
    createSourceFieldInterpretationIngestionService,
    createResidentCandidateService,
    createSourceResidentCandidateResolver,
    createImportPreviewService,
    createImportExecutionService,
    createSourceResidentLinkClient,
    createSourceResidentMappingClient,
    createSourceRecordIdentityMappingService,
    createResidentCreationClient,
    createSourceDocumentSyncEngine,
    createSyncEngine
};
