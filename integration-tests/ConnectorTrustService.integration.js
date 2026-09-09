"use strict";

require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorTrustService =
    require("../server-trust-boundary/ConnectorTrustService");

const ConnectorRegistrationVerifier =
    require("../server-trust-boundary/ConnectorRegistrationVerifier");

const ConnectorCredentialVerifier =
    require("../server-trust-boundary/ConnectorCredentialVerifier");

const SupabaseConnectorRegistrationRepository =
    require("../server-trust-boundary/SupabaseConnectorRegistrationRepository");

const SupabaseConnectorCredentialVerifierBackend =
    require("../server-trust-boundary/SupabaseConnectorCredentialVerifierBackend");

const CONNECTOR_ID =
    "f7d170fe-2591-43c1-920b-7014d3eb8a1d";

const FACILITY_ID =
    "b74f26b1-cbe9-41fb-b319-5ebda68b1d4c";

const hasRequiredEnvironment =
    Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_PUBLISHABLE_KEY &&
        process.env.CONNECTOR_CREDENTIAL
    );

test(
    "registered connector with valid credential produces verifiedContext",
    {
        skip: hasRequiredEnvironment
            ? false
            : "Supabase integration environment is not configured"
    },
    async () => {
        const registrationRepository =
            new SupabaseConnectorRegistrationRepository({
                supabaseUrl: process.env.SUPABASE_URL,
                apiKey: process.env.SUPABASE_PUBLISHABLE_KEY
            });

        const registrationVerifier =
            new ConnectorRegistrationVerifier({
                connectorRegistrationRepository:
                    registrationRepository
            });

        const credentialBackend =
            new SupabaseConnectorCredentialVerifierBackend({
                supabaseUrl: process.env.SUPABASE_URL,
                apiKey: process.env.SUPABASE_PUBLISHABLE_KEY
            });

        const credentialVerifier =
            new ConnectorCredentialVerifier({
                credentialVerifierBackend:
                    credentialBackend
            });

        const trustService =
            new ConnectorTrustService({
                connectorRegistrationVerifier:
                    registrationVerifier,
                connectorCredentialVerifier:
                    credentialVerifier
            });

        const result =
            await trustService.authenticate({
                connectorId: CONNECTOR_ID,
                credential:
                    process.env.CONNECTOR_CREDENTIAL,
                facilityId:
                    "client-supplied-facility-must-be-ignored"
            });

        assert.deepStrictEqual(result, {
            status: "verified",
            verifiedContext: {
                connectorId: CONNECTOR_ID,
                facilityId: FACILITY_ID
            }
        });
    }
);
