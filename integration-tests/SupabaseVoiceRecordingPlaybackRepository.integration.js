"use strict";

require("dotenv").config();

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseConnectorTrustAuthProvider =
    require(
        "../server-trust-boundary/" +
        "SupabaseConnectorTrustAuthProvider"
    );

const SupabaseVoiceRecordingPlaybackRepository =
    require(
        "../server-trust-boundary/" +
        "SupabaseVoiceRecordingPlaybackRepository"
    );

const REAL_FACILITY_ID =
    "b74f26b1-cbe9-41fb-b319-5ebda68b1d4c";

const REAL_RECORDING_ID =
    "3df09420-0686-4305-923c-743f12471846";

/*
 * Deliberately different but valid UUID.
 * There is currently only one real facility in the project.
 */
const OTHER_FACILITY_ID =
    "00000000-0000-4000-8000-000000000001";

const hasRequiredEnvironment =
    Boolean(
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_PUBLISHABLE_KEY &&
        process.env.SUPABASE_CONNECTOR_TRUST_EMAIL &&
        process.env.SUPABASE_CONNECTOR_TRUST_PASSWORD
    );

function createRepository() {
    const accessTokenProvider =
        new SupabaseConnectorTrustAuthProvider({
            supabaseUrl:
                process.env.SUPABASE_URL,

            apiKey:
                process.env.SUPABASE_PUBLISHABLE_KEY,

            email:
                process.env
                    .SUPABASE_CONNECTOR_TRUST_EMAIL,

            password:
                process.env
                    .SUPABASE_CONNECTOR_TRUST_PASSWORD
        });

    return new SupabaseVoiceRecordingPlaybackRepository({
        supabaseUrl:
            process.env.SUPABASE_URL,

        apiKey:
            process.env.SUPABASE_PUBLISHABLE_KEY,

        accessTokenProvider
    });
}

test(
    "real playback lookup succeeds only inside the recording facility",
    {
        skip:
            hasRequiredEnvironment
                ? false
                : "Supabase connector trust environment is not configured"
    },
    async () => {
        const repository =
            createRepository();

        /*
         * Positive control:
         * prove that this recording really exists and is readable
         * through the authenticated connector-trust RPC.
         */
        const insideFacility =
            await repository
                .findByFacilityAndRecording({
                    facilityId:
                        REAL_FACILITY_ID,

                    recordingId:
                        REAL_RECORDING_ID
                });

        assert.ok(
            insideFacility,
            "positive control recording must exist"
        );

        assert.equal(
            insideFacility.recordingId,
            REAL_RECORDING_ID
        );

        /*
         * Security assertion:
         * same real recording ID, different facility.
         */
        const outsideFacility =
            await repository
                .findByFacilityAndRecording({
                    facilityId:
                        OTHER_FACILITY_ID,

                    recordingId:
                        REAL_RECORDING_ID
                });

        assert.equal(
            outsideFacility,
            null,
            "cross-facility playback lookup must return no recording"
        );
    }
);
