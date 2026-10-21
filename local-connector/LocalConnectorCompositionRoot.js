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
const SourceRecordIdentityCandidateService =
    require("./SourceRecordIdentityCandidateService");
const SourceRecordIdentityCandidateResolver =
    require("./SourceRecordIdentityCandidateResolver");
const ConfirmedDocumentTypeHttpClient =
    require("./ConfirmedDocumentTypeHttpClient");
const ConfirmedDocumentTypeService =
    require("./ConfirmedDocumentTypeService");
const ResidentAdmissionDecisionHttpClient =
    require("./ResidentAdmissionDecisionHttpClient");
const ResidentAdmissionDecisionService =
    require("./ResidentAdmissionDecisionService");
const ResidentCreationHttpClient =
    require("./ResidentCreationHttpClient");
const SourceResidentCandidateResolver =
    require("./SourceResidentCandidateResolver");
const LocalImportPreviewService =
    require("./LocalImportPreviewService");
const RecipientCertificateImportPreviewService =
    require("./RecipientCertificateImportPreviewService");
const RecipientCertificateImportPreviewStrategy =
    require("./RecipientCertificateImportPreviewStrategy");
const RecipientCertificatePreviewFingerprint =
    require("./RecipientCertificatePreviewFingerprint");
const RecipientCertificateSemanticPlanner =
    require("./RecipientCertificateSemanticPlanner");
const GovernedSemanticTargetContract =
    require("./GovernedSemanticTargetContract");
const ConnectorSupportRecordRowBuilder =
    require("./ConnectorSupportRecordRowBuilder");
const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");
const ConnectorSemanticRecordPreviewHttpClient =
    require("./ConnectorSemanticRecordPreviewHttpClient");
const ConnectorSemanticLogicalRecordHttpClient =
    require("./ConnectorSemanticLogicalRecordHttpClient");
const ConnectorSupportRecordBatchWriteHttpClient =
    require("./ConnectorSupportRecordBatchWriteHttpClient");
const ConnectorSupportRecordExecutionGate =
    require("./ConnectorSupportRecordExecutionGate");
const ConnectorSupportRecordExecutionService =
    require("./ConnectorSupportRecordExecutionService");
const ConnectorResidentAdmissionHttpClient =
    require("./ConnectorResidentAdmissionHttpClient");
const ConnectorResidentProfileHttpClient =
    require("./ConnectorResidentProfileHttpClient");
const ConnectorResidentProfileQueryHttpClient =
    require("./ConnectorResidentProfileQueryHttpClient");
const ConnectorSemanticLogicalRecordPersistenceHttpClient =
    require("./ConnectorSemanticLogicalRecordPersistenceHttpClient");
const RecipientCertificateAtomicPersistenceHttpClient =
    require("./RecipientCertificateAtomicPersistenceHttpClient");
const RecipientCertificateExecutionGate =
    require("./RecipientCertificateExecutionGate");
const RecipientCertificateExecutionService =
    require("./RecipientCertificateExecutionService");
const LocalImportExecutionService =
    require("./LocalImportExecutionService");

const SourceTemplateAuthorityFieldMappingService =
    require("./SourceTemplateAuthorityFieldMappingService");

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
    sourceAdapter,
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
            localConnectorService,
            ...(sourceAdapter
                ? {
                    sourceAdapter
                }
                : {})
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

const SemanticRegistrationHttpClient =
    require("./SemanticRegistrationHttpClient");

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

async function createSourceTemplateAuthorityFieldMappingService({
    databasePath,
    configPath,
    semanticRegistrationEndpoint,
    fieldMappingEndpoint,
    interpretationEndpoint,
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

    const semanticRegistrationClient =
        new SemanticRegistrationHttpClient({
            serverTrustBoundaryEndpoint:
                semanticRegistrationEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

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

    const sourceFieldInterpretationClient =
        new SourceFieldInterpretationHttpClient({
            endpoint:
                interpretationEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    return new SourceTemplateAuthorityFieldMappingService({
        semanticRegistrationClient,
        sourceFieldMappingClient,
        sourceFieldInterpretationClient
    });
}

async function createSemanticRegistrationClient({
    databasePath,
    configPath,
    serverTrustBoundaryEndpoint,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    timeoutMs = 60000,
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

    return new SemanticRegistrationHttpClient({
        serverTrustBoundaryEndpoint,
        connectorId,
        credential,
        authorizationScheme,
        connectorIdHeader,
        timeoutMs,
        fetchImpl
    });
}

async function listDocumentSemanticTargets({
    databasePath,
    configPath,
    serverTrustBoundaryEndpoint,
    semanticType,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    timeoutMs = 60000,
    fetchImpl = globalThis.fetch
} = {}) {
    if (
        typeof semanticType !== "string" ||
        !semanticType.trim() ||
        typeof serverTrustBoundaryEndpoint !== "string" ||
        !serverTrustBoundaryEndpoint.trim()
    ) {
        return [];
    }

    try {
        const semanticRegistrationClient =
            await createSemanticRegistrationClient({
                databasePath,
                configPath,
                serverTrustBoundaryEndpoint,
                credential,
                authorizationScheme,
                connectorIdHeader,
                timeoutMs,
                fetchImpl
            });

        const result =
            await semanticRegistrationClient
                .listDocumentSemanticTargets(
                    semanticType.trim()
                );

        if (
            result?.status !== "found" ||
            !Array.isArray(result.targets)
        ) {
            const error = new Error(
                "Document semantic target authority returned invalid result"
            );

            error.code =
                "document_semantic_targets_unavailable";

            throw error;
        }

        return [
            ...new Set(
                result.targets.filter(
                    target =>
                        typeof target === "string" &&
                        target.trim()
                )
            )
        ];
    } catch (error) {
        if (
            error &&
            error.code ===
                "document_semantic_targets_unavailable"
        ) {
            throw error;
        }

        const authorityError = new Error(
            "Document semantic target authority is unavailable"
        );

        authorityError.code =
            "document_semantic_targets_unavailable";

        authorityError.cause =
            error;

        throw authorityError;
    }
}

async function listSemanticProjectionContracts({
    databasePath,
    configPath,
    serverTrustBoundaryEndpoint,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    timeoutMs = 60000,
    fetchImpl = globalThis.fetch
} = {}) {
    const createAuthorityUnavailableError = (
        cause = null
    ) => {
        const error = new Error(
            "Semantic projection contract authority is unavailable"
        );

        error.code =
            "semantic_projection_contracts_unavailable";

        if (cause) {
            error.cause = cause;
        }

        return error;
    };

    if (
        typeof serverTrustBoundaryEndpoint !== "string" ||
        !serverTrustBoundaryEndpoint.trim()
    ) {
        throw createAuthorityUnavailableError();
    }

    try {
        const semanticRegistrationClient =
            await createSemanticRegistrationClient({
                databasePath,
                configPath,
                serverTrustBoundaryEndpoint,
                credential,
                authorizationScheme,
                connectorIdHeader,
                timeoutMs,
                fetchImpl
            });

        const result =
            await semanticRegistrationClient
                .listSemanticProjectionContracts();

        if (
            result?.status !== "found" ||
            !Array.isArray(result.contracts)
        ) {
            throw createAuthorityUnavailableError();
        }

        const contracts = [];

        for (const contract of result.contracts) {
            const semanticType =
                typeof contract?.semanticType === "string"
                    ? contract.semanticType.trim()
                    : "";

            const sourceRecordIdentityRequired =
                contract?.sourceRecordIdentityRequired;

            const requiredSemanticTargets =
                contract?.requiredSemanticTargets;

            if (
                !semanticType ||
                typeof sourceRecordIdentityRequired !==
                    "boolean" ||
                !Array.isArray(
                    requiredSemanticTargets
                )
            ) {
                throw createAuthorityUnavailableError();
            }

            const normalizedTargets = [];

            for (
                const target
                of requiredSemanticTargets
            ) {
                if (
                    typeof target !== "string" ||
                    !target.trim()
                ) {
                    throw createAuthorityUnavailableError();
                }

                normalizedTargets.push(
                    target.trim()
                );
            }

            contracts.push({
                semanticType,
                sourceRecordIdentityRequired,
                requiredSemanticTargets:
                    Array.from(
                        new Set(
                            normalizedTargets
                        )
                    )
            });
        }

        const semanticTypes =
            contracts.map(
                contract =>
                    contract.semanticType
            );

        if (
            new Set(semanticTypes).size !==
                semanticTypes.length
        ) {
            throw createAuthorityUnavailableError();
        }

        return contracts;
    } catch (error) {
        if (
            error &&
            error.code ===
                "semantic_projection_contracts_unavailable"
        ) {
            throw error;
        }

        throw createAuthorityUnavailableError(
            error
        );
    }
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
    interpretationEndpoint,
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
            timeoutMs: 120000,
            fetchImpl
        });

    const sourceFieldInterpretationClient =
        new SourceFieldInterpretationHttpClient({
            endpoint:
                interpretationEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 120000,
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
            timeoutMs: 120000,
            fetchImpl
        });

    return new SourceResidentCandidateResolver({
        localConnectorService,
        sourceFieldMappingClient,
        sourceFieldInterpretationClient,
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

async function createRecipientCertificateImportPreviewService({
    databasePath,
    configPath,
    semanticRegistrationEndpoint,
    fieldMappingEndpoint,
    interpretationEndpoint,
    candidateEndpoint,
    residentMappingEndpoint,
    admissionDecisionEndpoint,
    semanticLogicalRecordEndpoint,
    residentProfileQueryEndpoint,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    fetchImpl = globalThis.fetch
} = {}) {
    const candidateResolver =
        await createSourceResidentCandidateResolver({
            databasePath,
            configPath,
            mappingEndpoint:
                fieldMappingEndpoint,
            interpretationEndpoint,
            candidateEndpoint,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl
        });

    const sourceResidentMappingClient =
        await createSourceResidentMappingClient({
            databasePath,
            configPath,
            endpoint:
                residentMappingEndpoint,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl
        });

    const admissionDecisionService =
        await createResidentAdmissionDecisionService({
            databasePath,
            configPath,
            endpoint:
                admissionDecisionEndpoint,
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

    const additionalSupportedSemanticTargets =
        await listDocumentSemanticTargets({
            databasePath,
            configPath,
            serverTrustBoundaryEndpoint:
                semanticRegistrationEndpoint,
            semanticType:
                "recipient_certificate",
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs:
                60000,
            fetchImpl
        });

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

    const sourceFieldInterpretationClient =
        new SourceFieldInterpretationHttpClient({
            endpoint:
                interpretationEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const semanticLogicalRecordClient =
        new ConnectorSemanticLogicalRecordHttpClient({
            endpoint:
                semanticLogicalRecordEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const residentProfileQueryClient =
        new ConnectorResidentProfileQueryHttpClient({
            endpoint:
                residentProfileQueryEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    return new RecipientCertificateImportPreviewService({
        candidateResolver,
        sourceResidentMappingClient,
        admissionDecisionService,
        localConnectorService,
        sourceFieldMappingClient,
        sourceFieldInterpretationClient,
        semanticLogicalRecordClient,
        residentProfileQueryClient,
        semanticPlanner:
            new RecipientCertificateSemanticPlanner({
                semanticContract:
                    new GovernedSemanticTargetContract({
                        supportedSemanticTargets:
                            additionalSupportedSemanticTargets
                    })
            }),
        previewFingerprint:
            new RecipientCertificatePreviewFingerprint(),
        strategy:
            new RecipientCertificateImportPreviewStrategy()
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

async function createRecipientCertificateImportExecutionService({
    databasePath,
    configPath,
    fieldMappingEndpoint,
    interpretationEndpoint,
    candidateEndpoint,
    residentMappingEndpoint,
    admissionDecisionEndpoint,
    semanticLogicalRecordEndpoint,
    residentProfileQueryEndpoint,
    residentProfileEndpoint,
    residentAdmissionEndpoint,
    semanticLogicalRecordPersistenceEndpoint,
    recipientCertificateAtomicPersistenceEndpoint,
    importPreviewService = null,
    credential,
    authorizationScheme,
    connectorIdHeader =
        "x-risen-connector-id",
    fetchImpl = globalThis.fetch
} = {}) {
    const resolvedImportPreviewService =
        importPreviewService ||
        await createRecipientCertificateImportPreviewService({
            databasePath,
            configPath,
            fieldMappingEndpoint,
            interpretationEndpoint,
            candidateEndpoint,
            residentMappingEndpoint,
            admissionDecisionEndpoint,
            semanticLogicalRecordEndpoint,
            residentProfileQueryEndpoint,
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

    const sourceResidentMappingClient =
        new SourceResidentMappingHttpClient({
            endpoint:
                residentMappingEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            fetchImpl
        });

    const residentAdmissionClient =
        new ConnectorResidentAdmissionHttpClient({
            endpoint:
                residentAdmissionEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const residentProfileClient =
        new ConnectorResidentProfileHttpClient({
            endpoint:
                residentProfileEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const semanticPersistenceClient =
        new ConnectorSemanticLogicalRecordPersistenceHttpClient({
            endpoint:
                semanticLogicalRecordPersistenceEndpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const atomicPersistenceClient =
        new RecipientCertificateAtomicPersistenceHttpClient({
            endpoint:
                recipientCertificateAtomicPersistenceEndpoint,
            connectorId,
            credentialProvider: {
                async getCredential() {
                    return credential;
                }
            },
            authorizationScheme,
            fetchImpl
        });

    const executionGate =
        new RecipientCertificateExecutionGate({
            importPreviewService:
                resolvedImportPreviewService
        });

    const executionService =
        new RecipientCertificateExecutionService({
            sourceResidentMappingClient,
            atomicPersistenceClient
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
        timeoutMs: 120000,
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

function createSourceRecordIdentityCandidateService({
    databasePath,
    configPath
} = {}) {
    const localConnectorService =
        createService({
            databasePath,
            configPath
        });

    return new SourceRecordIdentityCandidateService({
        localConnectorService,
        resolver:
            new SourceRecordIdentityCandidateResolver()
    });
}

async function createResidentAdmissionDecisionService({
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

    const persistenceClient =
        new ResidentAdmissionDecisionHttpClient({
            endpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    return new ResidentAdmissionDecisionService({
        localConnectorService,
        persistenceClient
    });
}

async function createConfirmedDocumentTypeService({
    databasePath,
    configPath,
    endpoint,
    credential,
    authorizationScheme,
    allowedDocumentTypes,
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

    const persistenceClient =
        new ConfirmedDocumentTypeHttpClient({
            endpoint,
            connectorId,
            credential,
            authorizationScheme,
            connectorIdHeader,
            timeoutMs: 60000,
            fetchImpl
        });

    const confirmationService =
        new ConfirmedDocumentTypeService({
            localConnectorService,
            persistenceClient,
            allowedDocumentTypes
        });

    return {
        confirm:
            input =>
                confirmationService.confirm(input),
        get:
            input =>
                persistenceClient.get(input)
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
    createSourceTemplateAuthorityFieldMappingService,
    createSemanticRegistrationClient,
    listDocumentSemanticTargets,
    listSemanticProjectionContracts,
    createSourceFieldInterpretationIngestionService,
    createResidentCandidateService,
    createSourceResidentCandidateResolver,
    createImportPreviewService,
    createRecipientCertificateImportPreviewService,
    createImportExecutionService,
    createRecipientCertificateImportExecutionService,
    createSourceResidentLinkClient,
    createSourceResidentMappingClient,
    createSourceRecordIdentityMappingService,
    createSourceRecordIdentityCandidateService,
    createConfirmedDocumentTypeService,
    createResidentAdmissionDecisionService,
    createResidentCreationClient,
    createSourceDocumentSyncEngine,
    createSyncEngine
};
