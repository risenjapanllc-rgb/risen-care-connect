"use strict";

const {
    createServerTrustBoundaryRuntime
} = require("./runtime");

const ServerTrustBoundaryHttpAdapter =
    require("./ServerTrustBoundaryHttpAdapter");

const ConnectorCredentialTransport =
    require("./ConnectorCredentialTransport");

const ServerTrustBoundaryTransport =
    require("./ServerTrustBoundaryTransport");

const {
    createServerTrustBoundaryApp
} = require("./createServerTrustBoundaryApp");

/**
 * Build the complete Server Trust Boundary HTTP runtime.
 *
 * Server-side only.
 * Must not be used by the facility-side Local Connector runtime.
 */
function createServerTrustBoundaryHttpRuntime({
    supabaseUrl,
    apiKey,
    connectorTrustEmail,
    connectorTrustPassword,
    authorizationScheme,
    connectorIdHeader,
    endpointPath,
    jsonBodyLimit
} = {}) {
    if (
        typeof authorizationScheme !== "string" ||
        !authorizationScheme.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires authorizationScheme"
        );
    }

    if (
        typeof connectorIdHeader !== "string" ||
        !connectorIdHeader.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires connectorIdHeader"
        );
    }

    if (
        typeof endpointPath !== "string" ||
        !endpointPath.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires endpointPath"
        );
    }

    if (
        typeof jsonBodyLimit !== "string" ||
        !jsonBodyLimit.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires jsonBodyLimit"
        );
    }

    const coreRuntime =
        createServerTrustBoundaryRuntime({
            supabaseUrl,
            apiKey,
            connectorTrustEmail,
            connectorTrustPassword
        });

    const httpAdapter =
        new ServerTrustBoundaryHttpAdapter({
            connectorIngestionService:
                coreRuntime.connectorIngestionService
        });

    const credentialTransport =
        new ConnectorCredentialTransport({
            authorizationScheme
        });

    const transport =
        new ServerTrustBoundaryTransport({
            httpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const app =
        createServerTrustBoundaryApp({
            transport,
            endpointPath,
            jsonBodyLimit
        });

    return {
        app
    };
}

module.exports = {
    createServerTrustBoundaryHttpRuntime
};
