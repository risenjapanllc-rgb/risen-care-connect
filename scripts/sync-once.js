"use strict";

require("dotenv").config({
    quiet: true
});

const {
    DatabaseSync
} = require("node:sqlite");

const mysql =
    require("mysql2/promise");

const {
    createSyncEngine,
    createResidentCandidateService
} = require(
    "../local-connector/LocalConnectorCompositionRoot"
);

const DatabasePathResolver =
    require(
        "../local-connector/DatabasePathResolver"
    );

const MySqlSourceAdapter =
    require(
        "../local-connector/MySqlSourceAdapter"
    );

const MySqlSyncEngine =
    require(
        "../local-connector/MySqlSyncEngine"
    );

const MySqlLogicalRecordProjector =
    require(
        "../local-connector/MySqlLogicalRecordProjector"
    );

const MySqlResidentCandidateMatcher =
    require(
        "../local-connector/MySqlResidentCandidateMatcher"
    );

const LogicalSourceResidentAssociationHttpClient =
    require(
        "../local-connector/LogicalSourceResidentAssociationHttpClient"
    );

const LogicalSourceSemanticHttpClient =
    require(
        "../local-connector/LogicalSourceSemanticHttpClient"
    );

const MySqlResidentProfileSemanticProjector =
    require(
        "../local-connector/MySqlResidentProfileSemanticProjector"
    );

const SqliteMySqlSemanticStateStore =
    require(
        "../local-connector/SqliteMySqlSemanticStateStore"
    );

const SqliteMySqlSourceStateStore =
    require(
        "../local-connector/SqliteMySqlSourceStateStore"
    );

const ProductionRuntimeConfig =
    require(
        "../local-connector/ProductionRuntimeConfig"
    );

const {
    createConnectorCredentialProvider
} =
    require(
        "../local-connector/ConnectorCredentialProviderFactory"
    );

const LocalConnectorConfig =
    require(
        "../local-connector/LocalConnectorConfig"
    );

const MySqlRuntimeSourceResolver =
    require(
        "../local-connector/MySqlRuntimeSourceResolver"
    );

const connectorCredentialProvider =
    createConnectorCredentialProvider();

async function commonTrustOptions(
    runtimeConfig
) {
    return {
        endpoint:
            runtimeConfig
                .resolveServerTrustBoundaryEndpoint(),
        credential:
            await connectorCredentialProvider
                .getCredential(),
        authorizationScheme:
            runtimeConfig
                .resolveAuthorizationScheme(),
        connectorIdHeader:
            runtimeConfig
                .resolveConnectorIdHeader()
    };
}

async function syncFiles({
    runtimeConfig,
    databasePath
}) {
    const engine =
        await createSyncEngine({
            databasePath,
            ...await commonTrustOptions(
                runtimeConfig
            )
        });

    const relativePath =
        process.env
            .RISEN_SYNC_RELATIVE_PATH;

    return await engine.syncOnce({
        ...(typeof relativePath === "string" &&
            relativePath.trim() !== ""
            ? {
                relativePaths: [
                    relativePath.trim()
                ]
            }
            : {})
    });
}

async function syncMySql({
    runtimeConfig,
    databasePath,
    source
}) {

    if (!source) {
        return null;
    }

    if (
        typeof source.birthDateField !== "string" ||
        !source.birthDateField.trim()
    ) {
        const error =
            new Error(
                "MySQL birth date field mapping is required"
            );

        error.code =
            "mysql_semantic_mapping_incomplete";

        throw error;
    }

    const sourceAdapter =
        new MySqlSourceAdapter({
            sourceId:
                source.sourceId,
            query:
                source.query,
            connectionFactory:
                async () =>
                    mysql.createConnection({
                        host:
                            source.host,
                        port:
                            source.port,
                        user:
                            source.user,
                        password:
                            source.password,
                        database:
                            source.database,
                        dateStrings:
                            true
                    })
        });

    const trustOptions =
        await commonTrustOptions(
            runtimeConfig
        );

    const candidateEndpoint =
        new URL(
            "/connector/resident-candidates",
            new URL(
                trustOptions.endpoint
            ).origin
        ).toString();

    const residentCandidateClient =
        await createResidentCandidateService({
            databasePath,
            endpoint:
                candidateEndpoint,
            credential:
                trustOptions.credential,
            authorizationScheme:
                trustOptions
                    .authorizationScheme,
            connectorIdHeader:
                trustOptions
                    .connectorIdHeader
        });

    const residentMatcher =
        new MySqlResidentCandidateMatcher({
            residentCandidateClient
        });

    const connectorId =
        residentCandidateClient
            .connectorId;

    const associationEndpoint =
        new URL(
            "/connector/logical-source-resident-associations",
            new URL(
                trustOptions.endpoint
            ).origin
        ).toString();

    const associationClient =
        new LogicalSourceResidentAssociationHttpClient({
            endpoint:
                associationEndpoint,
            connectorId,
            credential:
                trustOptions.credential,
            authorizationScheme:
                trustOptions
                    .authorizationScheme,
            connectorIdHeader:
                trustOptions
                    .connectorIdHeader,
            fetchImpl:
                globalThis.fetch
        });

    const semanticEndpoint =
        new URL(
            "/connector/logical-source-semantic-records",
            new URL(
                trustOptions.endpoint
            ).origin
        ).toString();

    const semanticClient =
        new LogicalSourceSemanticHttpClient({
            endpoint:
                semanticEndpoint,
            connectorId,
            credential:
                trustOptions.credential,
            authorizationScheme:
                trustOptions
                    .authorizationScheme,
            connectorIdHeader:
                trustOptions
                    .connectorIdHeader,
            fetchImpl:
                globalThis.fetch
        });

    const residentProfileSemanticProjector =
        new MySqlResidentProfileSemanticProjector();

    const semanticProjector = {
        project(input = {}) {
            return residentProfileSemanticProjector
                .project({
                    ...input,
                    birthDateField:
                        source.birthDateField.trim()
                });
        }
    };

    const recordProjector =
        new MySqlLogicalRecordProjector();

    const database =
        new DatabaseSync(
            databasePath
        );

    try {
        const stateStore =
            new SqliteMySqlSourceStateStore({
                database
            });

        const semanticStateStore =
            new SqliteMySqlSemanticStateStore({
                database
            });

        const engine =
            new MySqlSyncEngine({
                sourceAdapter,
                recordProjector,
                residentMatcher,
                associationClient,
                semanticProjector,
                semanticClient,
                semanticStateStore,
                stateStore,
                identityField:
                    source.identityField,
                residentCodeField:
                    source.residentCodeField,
                residentNameField:
                    source.residentNameField
            });

        return await engine.syncOnce(
            source.sourceId
        );
    } finally {
        database.close();
    }
}

async function main() {
    const runtimeConfig =
        new ProductionRuntimeConfig();

    const databasePath =
        new DatabasePathResolver()
            .resolve();

    const localConfig =
        new LocalConnectorConfig();

    process.stderr.write(
        "sync_stage=files_config_start\n"
    );

    const allowedFolder =
        await localConfig
            .getAllowedFolder();

    let files;

    if (allowedFolder) {
        process.stderr.write(
            "sync_stage=files_start\n"
        );

        files =
            await syncFiles({
                runtimeConfig,
                databasePath
            });

        process.stderr.write(
            "sync_stage=files_complete\n"
        );
    } else {
        files = {
            status:
                "skipped",
            failed:
                0,
            reason:
                "not_configured"
        };

        process.stderr.write(
            "sync_stage=files_skipped reason=not_configured\n"
        );
    }

    process.stderr.write(
        "sync_stage=mysql_config_start\n"
    );

    const mysqlSource =
        await new MySqlRuntimeSourceResolver({
            localConfig,
            runtimeConfig
        }).resolve();

    process.stderr.write(
        `sync_stage=mysql_config_complete configured=${mysqlSource ? "true" : "false"}\n`
    );

    process.stderr.write(
        "sync_stage=mysql_sync_start\n"
    );

    const mysqlResult =
        await syncMySql({
            runtimeConfig,
            databasePath,
            source:
                mysqlSource
        });

    process.stderr.write(
        "sync_stage=mysql_sync_complete\n"
    );

    const result = {
        files,
        mysql:
            mysqlResult
    };

    process.stdout.write(
        `${JSON.stringify(result)}\n`
    );

    const fileSuccess =
        (
            files.status === "completed" ||
            files.status === "skipped"
        ) &&
        files.failed === 0;

    const mysqlSuccess =
        mysqlResult === null ||
        mysqlResult.failed === 0;

    if (
        fileSuccess &&
        mysqlSuccess
    ) {
        return;
    }

    process.exitCode = 1;
}

main().catch(error => {
    const safeError = {
        name:
            typeof error?.name === "string"
                ? error.name
                : "Error",
        code:
            typeof error?.code === "string"
                ? error.code
                : null,
        httpStatus:
            Number.isInteger(
                error?.httpStatus
            )
                ? error.httpStatus
                : null,
        message:
            typeof error?.message === "string"
                ? error.message
                : "sync failed"
    };

    process.stderr.write(
        `sync_once_failed ${JSON.stringify(safeError)}\n`
    );

    process.exitCode = 1;
});
