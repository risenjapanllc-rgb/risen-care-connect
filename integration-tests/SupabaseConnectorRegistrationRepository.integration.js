"use strict";

require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseConnectorRegistrationRepository =
    require("../server-trust-boundary/SupabaseConnectorRegistrationRepository");

const CONNECTOR_ID =
    "f7d170fe-2591-43c1-920b-7014d3eb8a1d";

const EXPECTED_FACILITY_ID =
    "b74f26b1-cbe9-41fb-b319-5ebda68b1d4c";

const hasRequiredEnvironment =
    Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_PUBLISHABLE_KEY
    );

test(
    "registered connector is retrieved from Supabase",
    {
        skip: hasRequiredEnvironment
            ? false
            : "Supabase integration environment is not configured"
    },
    async () => {
        const repository =
            new SupabaseConnectorRegistrationRepository({
                supabaseUrl: process.env.SUPABASE_URL,
                apiKey: process.env.SUPABASE_PUBLISHABLE_KEY
            });

        const registration =
            await repository.getRegistration({
                connectorId: CONNECTOR_ID
            });

        assert.deepStrictEqual(registration, {
            connectorId: CONNECTOR_ID,
            facilityId: EXPECTED_FACILITY_ID,
            active: true
        });
    }
);

test(
    "unknown connector returns null from Supabase",
    {
        skip: hasRequiredEnvironment
            ? false
            : "Supabase integration environment is not configured"
    },
    async () => {
        const repository =
            new SupabaseConnectorRegistrationRepository({
                supabaseUrl: process.env.SUPABASE_URL,
                apiKey: process.env.SUPABASE_PUBLISHABLE_KEY
            });

        const registration =
            await repository.getRegistration({
                connectorId:
                    "00000000-0000-4000-8000-000000000000"
            });

        assert.strictEqual(registration, null);
    }
);
