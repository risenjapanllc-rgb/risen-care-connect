"use strict";

require("dotenv").config();

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseConnectorTrustAuthProvider =
    require("../server-trust-boundary/SupabaseConnectorTrustAuthProvider");

const SupabaseRecordIdentityCandidateProvider =
    require("../server-trust-boundary/SupabaseRecordIdentityCandidateProvider");

const CONNECTOR_ID =
    "f7d170fe-2591-43c1-920b-7014d3eb8a1d";

const FACILITY_ID =
    "b74f26b1-cbe9-41fb-b319-5ebda68b1d4c";

const hasRequiredEnvironment =
    Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_PUBLISHABLE_KEY &&
        process.env.SUPABASE_CONNECTOR_TRUST_EMAIL &&
        process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD
    );

test(
    "trusted identity lookup returns no candidates for synthetic identity",
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

        const provider =
            new SupabaseRecordIdentityCandidateProvider({
                supabaseUrl:
                    process.env.SUPABASE_URL,
                apiKey:
                    process.env.SUPABASE_PUBLISHABLE_KEY,
                accessTokenProvider:
                    authProvider
            });

        const nonce =
            `${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`;

        const result =
            await provider.findCandidates({
                verifiedFacilityId:
                    FACILITY_ID,
                verifiedConnectorId:
                    CONNECTOR_ID,
                sourceDocumentKey:
                    `integration-document-${nonce}`,
                sourceRecordKey:
                    `integration-record-${nonce}`
            });

        assert.deepStrictEqual(result, []);
    }
);
