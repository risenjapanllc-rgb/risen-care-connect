"use strict";

require("dotenv").config({
    quiet: true
});

const {
    createSourceDocumentSyncEngine
} = require(
    "../local-connector/LocalConnectorCompositionRoot"
);

const DatabasePathResolver =
    require(
        "../local-connector/DatabasePathResolver"
    );

const ProductionRuntimeConfig =
    require(
        "../local-connector/ProductionRuntimeConfig"
    );

async function syncSourceDocuments({
    runtimeConfig,
    databasePath,
    relativePath,
    createSourceDocumentSyncEngine:
        createEngine =
            createSourceDocumentSyncEngine
}) {
    const engine =
        await createEngine({
            databasePath,
            endpoint:
                runtimeConfig
                    .resolveSourceDocumentEndpoint(),
            credential:
                runtimeConfig
                    .requireConnectorCredential(),
            authorizationScheme:
                runtimeConfig
                    .resolveAuthorizationScheme(),
            connectorIdHeader:
                runtimeConfig
                    .resolveConnectorIdHeader()
        });

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

async function main() {
    if (
        process.argv.includes("--help") ||
        process.argv.includes("-h")
    ) {
        process.stdout.write(
            "Usage: npm run sync:source-documents:once\n"
        );
        return;
    }

    const runtimeConfig =
        new ProductionRuntimeConfig();

    const databasePath =
        new DatabasePathResolver()
            .resolve();

    const result =
        await syncSourceDocuments({
            runtimeConfig,
            databasePath,
            relativePath:
                process.env
                    .RISEN_SYNC_RELATIVE_PATH
        });

    process.stdout.write(
        `${JSON.stringify(result)}\n`
    );

    if (
        result.status === "completed" &&
        result.failed === 0
    ) {
        return;
    }

    process.exitCode = 1;
}

if (require.main === module) {
    main().catch(() => {
        process.stderr.write(
            "source_document_sync_once_failed\n"
        );
        process.exitCode = 1;
    });
}

module.exports = {
    syncSourceDocuments
};
