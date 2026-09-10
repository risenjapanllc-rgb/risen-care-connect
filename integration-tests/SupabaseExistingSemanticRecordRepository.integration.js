"use strict";

require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseConnectorTrustAuthProvider =
    require("../server-trust-boundary/SupabaseConnectorTrustAuthProvider");

const SupabaseExistingSemanticRecordRepository =
    require("../server-trust-boundary/SupabaseExistingSemanticRecordRepository");

const FACILITY_ID =
    "b74f26b1-cbe9-41fb-b319-5ebda68b1d4c";

const SYNTHETIC_RECORD_ID =
    "00000000-0000-4000-8000-000000000001";

const hasRequiredEnvironment =
    Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_PUBLISHABLE_KEY &&
        process.env.SUPABASE_CONNECTOR_TRUST_EMAIL &&
        process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD
    );

test(
    "trusted semantic record state lookup returns null for synthetic record",
    {
        skip: hasRequiredEnvironment
            ? false
            : "Supabase connector trust environment is not configured"
    },
    async () => {
        const authProvider =
            new SupabaseConnectorTrustAuthProvider({
                supabaseUrl:
                    process.env.SUPABASE_URL,
                apiKey:
                    process.env.SUPABASE_PUBLISHABLE_KEY,
                email:
                    process.env.SUPABASE_CONNECTOR_TRUST_EMAIL,
                password:
                    process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD
            });

        const repository =
            new SupabaseExistingSemanticRecordRepository({
                supabaseUrl:
                    process.env.SUPABASE_URL,
                apiKey:
                    process.env.SUPABASE_PUBLISHABLE_KEY,
                accessTokenProvider:
                    authProvider
            });

        const result =
            await repository.getByRecordId({
                facilityId:
                    FACILITY_ID,
                recordId:
                    SYNTHETIC_RECORD_ID
            });

        assert.strictEqual(result, null);
    }
);
