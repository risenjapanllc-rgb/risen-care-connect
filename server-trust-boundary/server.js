"use strict";

require("dotenv").config({
    quiet: true
});

const {
    createServerTrustBoundaryHttpRuntime
} = require("./httpRuntime");

function requireEnv(name, env = process.env) {
    const value =
        env[name];

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error(
            `Missing required environment variable: ${name}`
        );
    }

    return value;
}

function parsePort(value) {
    const port =
        Number(value);

    if (
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535
    ) {
        throw new Error(
            "SERVER_TRUST_BOUNDARY_PORT must be an integer from 1 to 65535"
        );
    }

    return port;
}

function resolveServerTrustBoundaryConfig(
    env = process.env
) {
    return {
        host:
            env.SERVER_TRUST_BOUNDARY_HOST ||
            "127.0.0.1",

        port:
            parsePort(
                env.SERVER_TRUST_BOUNDARY_PORT ||
                "8787"
            ),

        authorizationScheme:
            env.SERVER_TRUST_BOUNDARY_AUTH_SCHEME ||
            "RISEN-Connector",

        connectorIdHeader:
            env.SERVER_TRUST_BOUNDARY_CONNECTOR_ID_HEADER ||
            "x-risen-connector-id",

        endpointPath:
            env.SERVER_TRUST_BOUNDARY_ENDPOINT ||
            "/connector/ingest",

        jsonBodyLimit:
            env.SERVER_TRUST_BOUNDARY_JSON_BODY_LIMIT ||
            "100kb",

        supabaseUrl:
            requireEnv(
                "SUPABASE_URL",
                env
            ),

        apiKey:
            requireEnv(
                "SUPABASE_PUBLISHABLE_KEY",
                env
            ),

        connectorTrustEmail:
            requireEnv(
                "SUPABASE_CONNECTOR_TRUST_EMAIL",
                env
            ),

        connectorTrustPassword:
            requireEnv(
                "SUPABASE_CONNECTOR_TRUST_PASSWORD",
                env
            )
    };
}

function startServerTrustBoundary({
    env = process.env,
    runtimeFactory =
        createServerTrustBoundaryHttpRuntime
} = {}) {
    /*
     * Resolve and validate all configuration before
     * constructing or listening on the HTTP server.
     */
    const config =
        resolveServerTrustBoundaryConfig(env);

    const runtime =
        runtimeFactory({
            supabaseUrl:
                config.supabaseUrl,
            apiKey:
                config.apiKey,
            connectorTrustEmail:
                config.connectorTrustEmail,
            connectorTrustPassword:
                config.connectorTrustPassword,
            authorizationScheme:
                config.authorizationScheme,
            connectorIdHeader:
                config.connectorIdHeader,
            endpointPath:
                config.endpointPath,
            jsonBodyLimit:
                config.jsonBodyLimit,
            diagnosticLogger: console
        });

    const server =
        runtime.app.listen(
            config.port,
            config.host,
            () => {
                console.log(
                    `Server Trust Boundary listening on ${config.host}:${config.port}`
                );
            }
        );

    return server;
}

if (require.main === module) {
    startServerTrustBoundary();
}

module.exports = {
    startServerTrustBoundary,
    resolveServerTrustBoundaryConfig,
    requireEnv,
    parsePort
};
