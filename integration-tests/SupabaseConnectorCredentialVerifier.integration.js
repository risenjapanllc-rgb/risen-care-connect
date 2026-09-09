"use strict";

require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseConnectorCredentialVerifierBackend =
    require("../server-trust-boundary/SupabaseConnectorCredentialVerifierBackend");

const CONNECTOR_ID =
    "f7d170fe-2591-43c1-920b-7014d3eb8a1d";

const hasRequiredEnvironment =
    Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_PUBLISHABLE_KEY &&
        process.env.CONNECTOR_CREDENTIAL
    );

test(
    "valid connector credential is accepted by Supabase",
    {
        skip: hasRequiredEnvironment
            ? false
            : "Supabase integration environment is not configured"
    },
    async () => {
        const backend =
            new SupabaseConnectorCredentialVerifierBackend({
                supabaseUrl: process.env.SUPABASE_URL,
                apiKey: process.env.SUPABASE_PUBLISHABLE_KEY
            });

        const verified =
            await backend.verifyCredential({
                connectorId: CONNECTOR_ID,
                credential: process.env.CONNECTOR_CREDENTIAL
            });

        assert.deepStrictEqual(verified, {
            authenticated: true
        });
    }
);

test(
    "invalid connector credential is rejected by Supabase",
    {
        skip: hasRequiredEnvironment
            ? false
            : "Supabase integration environment is not configured"
    },
    async () => {
        const backend =
            new SupabaseConnectorCredentialVerifierBackend({
                supabaseUrl: process.env.SUPABASE_URL,
                apiKey: process.env.SUPABASE_PUBLISHABLE_KEY
            });

        const verified =
            await backend.verifyCredential({
                connectorId: CONNECTOR_ID,
                credential:
                    "integration-test-invalid-credential"
            });

        assert.deepStrictEqual(verified, {
            authenticated: false
        });
    }
);
