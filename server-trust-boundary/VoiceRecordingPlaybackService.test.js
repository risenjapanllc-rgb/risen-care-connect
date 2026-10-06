"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceRecordingPlaybackService =
    require("./VoiceRecordingPlaybackService");

test(
    "builds a Supabase Storage signed playback URL with storage/v1",
    async () => {
        let fetchUrl =
            null;

        let fetchOptions =
            null;

        const service =
            new VoiceRecordingPlaybackService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",

                            verifiedContext: {
                                facilityId:
                                    "facility-A"
                            }
                        };
                    }
                },

                recordingRepository: {
                    async findByFacilityAndRecording() {
                        return null;
                    }
                },

                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-api-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        return "test-access-token";
                    }
                },

                async fetchImpl(
                    url,
                    options
                ) {
                    fetchUrl =
                        url;

                    fetchOptions =
                        options;

                    return {
                        ok:
                            true,

                        async json() {
                            return {
                                signedURL:
                                    "/object/sign/communication-recordings/facility-A/log-A/recording.wav?token=test"
                            };
                        }
                    };
                }
            });

        const signedUrl =
            await service.createSignedUrl({
                storageBucket:
                    "communication-recordings",

                storagePath:
                    "facility-A/log-A/recording.wav"
            });

        assert.equal(
            fetchUrl,
            "https://example.supabase.co/storage/v1/object/sign/communication-recordings/facility-A/log-A/recording.wav"
        );

        assert.equal(
            fetchOptions.method,
            "POST"
        );

        assert.equal(
            fetchOptions.headers.Authorization,
            "Bearer test-access-token"
        );

        assert.equal(
            JSON.parse(
                fetchOptions.body
            ).expiresIn,
            60
        );

        assert.equal(
            signedUrl,
            "https://example.supabase.co/storage/v1/object/sign/communication-recordings/facility-A/log-A/recording.wav?token=test"
        );
    }
);
