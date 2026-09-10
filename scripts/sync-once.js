"use strict";

require("dotenv").config();

const {
    createSyncEngine
} = require(
    "../local-connector/LocalConnectorCompositionRoot"
);

async function main() {
    const host =
        process.env
            .SERVER_TRUST_BOUNDARY_HOST ||
        "127.0.0.1";

    const port =
        process.env
            .SERVER_TRUST_BOUNDARY_PORT ||
        "8787";

    const endpointPath =
        process.env
            .SERVER_TRUST_BOUNDARY_ENDPOINT ||
        "/connector/ingest";

    const endpoint =
        `http://${host}:${port}${endpointPath}`;

    const credential =
        process.env
            .CONNECTOR_CREDENTIAL;

    const authorizationScheme =
        process.env
            .SERVER_TRUST_BOUNDARY_AUTH_SCHEME ||
        "RISEN-Connector";

    const connectorIdHeader =
        process.env
            .SERVER_TRUST_BOUNDARY_CONNECTOR_ID_HEADER ||
        "x-risen-connector-id";

    const engine =
        await createSyncEngine({
            endpoint,
            credential,
            authorizationScheme,
            connectorIdHeader
        });

    const relativePath =
        process.env
            .RISEN_SYNC_RELATIVE_PATH;

    const result =
        await engine.syncOnce({
            ...(typeof relativePath === "string" &&
                relativePath.trim() !== ""
                ? {
                    relativePaths: [
                        relativePath
                    ]
                }
                : {})
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

main().catch(() => {
    process.stderr.write(
        "sync_once_failed\n"
    );
    process.exitCode = 1;
});
