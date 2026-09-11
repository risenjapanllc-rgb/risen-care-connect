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
    createIngestionService
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

const SqliteMySqlSourceStateStore =
    require(
        "../local-connector/SqliteMySqlSourceStateStore"
    );

const ProductionRuntimeConfig =
    require(
        "../local-connector/ProductionRuntimeConfig"
    );

function commonTrustOptions(
    runtimeConfig
) {
    return {
        endpoint:
            runtimeConfig
                .resolveServerTrustBoundaryEndpoint(),
        credential:
            runtimeConfig
                .requireConnectorCredential(),
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
            ...commonTrustOptions(
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
    databasePath
}) {
    const source =
        runtimeConfig
            .resolveMySqlSource();

    if (!source) {
        return null;
    }

    const ingestionService =
        await createIngestionService({
            databasePath,
            ...commonTrustOptions(
                runtimeConfig
            )
        });

    const database =
        new DatabaseSync(
            databasePath
        );

    try {
        const stateStore =
            new SqliteMySqlSourceStateStore({
                database
            });

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
                                source.database
                        })
            });

        const engine =
            new MySqlSyncEngine({
                sourceAdapter,
                ingestionService,
                stateStore
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

    const files =
        await syncFiles({
            runtimeConfig,
            databasePath
        });

    const mysqlResult =
        await syncMySql({
            runtimeConfig,
            databasePath
        });

    const result = {
        files,
        mysql:
            mysqlResult
    };

    process.stdout.write(
        `${JSON.stringify(result)}\n`
    );

    const fileSuccess =
        files.status === "completed" &&
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

main().catch(() => {
    process.stderr.write(
        "sync_once_failed\n"
    );
    process.exitCode = 1;
});
