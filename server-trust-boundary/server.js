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
    const recordingEnabledValue =
        String(
            env.VONAGE_VOICE_RECORDING_ENABLED ||
            "false"
        )
            .trim()
            .toLowerCase();

    if (
        recordingEnabledValue !== "true" &&
        recordingEnabledValue !== "false"
    ) {
        throw new Error(
            "VONAGE_VOICE_RECORDING_ENABLED must be true or false"
        );
    }

    const vonageVoiceRecordingEnabled =
        recordingEnabledValue === "true";

    const vonageVoiceRecordingEventUrl =
        String(
            env.VONAGE_VOICE_RECORDING_EVENT_URL ||
            ""
        ).trim();

    if (
        vonageVoiceRecordingEnabled &&
        !vonageVoiceRecordingEventUrl
    ) {
        throw new Error(
            "VONAGE_VOICE_RECORDING_EVENT_URL is required when recording is enabled"
        );
    }

    if (vonageVoiceRecordingEventUrl) {
        let parsed;

        try {
            parsed =
                new URL(
                    vonageVoiceRecordingEventUrl
                );
        } catch (error) {
            throw new Error(
                "VONAGE_VOICE_RECORDING_EVENT_URL is invalid"
            );
        }

        if (
            parsed.protocol !== "https:"
        ) {
            throw new Error(
                "VONAGE_VOICE_RECORDING_EVENT_URL must use HTTPS"
            );
        }
    }

    const vonageVoiceEventUrl =
        requireEnv(
            "VONAGE_VOICE_EVENT_URL",
            env
        );

    let parsedVoiceEventUrl;

    try {
        parsedVoiceEventUrl =
            new URL(
                vonageVoiceEventUrl
            );
    } catch (error) {
        throw new Error(
            "VONAGE_VOICE_EVENT_URL is invalid"
        );
    }

    if (
        parsedVoiceEventUrl.protocol !==
        "https:"
    ) {
        throw new Error(
            "VONAGE_VOICE_EVENT_URL must use HTTPS"
        );
    }

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

        sourceDocumentJsonBodyLimit:
            env.SERVER_TRUST_BOUNDARY_SOURCE_DOCUMENT_JSON_BODY_LIMIT ||
            "25mb",

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
            ),

        vonageApiSignatureSecret:
            requireEnv(
                "VONAGE_API_SIGNATURE_SECRET",
                env
            ),

        vonageVoiceRecordingEnabled,

        vonageVoiceRecordingEventUrl:
            vonageVoiceRecordingEventUrl ||
            null,

        vonageVoiceEventUrl
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
            vonageApiSignatureSecret:
                config.vonageApiSignatureSecret,
            vonageVoiceRecordingEnabled:
                config.vonageVoiceRecordingEnabled,
            vonageVoiceRecordingEventUrl:
                config.vonageVoiceRecordingEventUrl,
            vonageVoiceEventUrl:
                config.vonageVoiceEventUrl,
            authorizationScheme:
                config.authorizationScheme,
            connectorIdHeader:
                config.connectorIdHeader,
            endpointPath:
                config.endpointPath,
            jsonBodyLimit:
                config.jsonBodyLimit,
            sourceDocumentJsonBodyLimit:
                config.sourceDocumentJsonBodyLimit,
            diagnosticLogger: console
        });

    runtime.app.get(
        "/health",
        (req, res) => {
            return res.json({
                success: true,
                service:
                    "RISEN CARE Server Trust Boundary",
                status: "ready"
            });
        }
    );

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
