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

test(
    "does not sign storage when the recording is not found in the verified facility",
    async () => {
        let repositoryCall =
            null;

        let storageFetchCalled =
            false;

        const service =
            new VoiceRecordingPlaybackService({
                connectorTrustService: {
                    async authenticate({
                        connectorId,
                        credential
                    }) {
                        assert.equal(
                            connectorId,
                            "connector-A"
                        );

                        assert.equal(
                            credential,
                            "credential-A"
                        );

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
                    async findByFacilityAndRecording({
                        facilityId,
                        recordingId
                    }) {
                        repositoryCall = {
                            facilityId,
                            recordingId
                        };

                        /*
                         * Simulate recording-B belonging to another
                         * facility. The facility-scoped repository/RPC
                         * therefore returns no recording.
                         */
                        return null;
                    }
                },

                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-api-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        throw new Error(
                            "storage signing must not be reached"
                        );
                    }
                },

                async fetchImpl() {
                    storageFetchCalled =
                        true;

                    throw new Error(
                        "storage signing must not be reached"
                    );
                }
            });

        const result =
            await service.getPlayback({
                connectorId:
                    "connector-A",

                credential:
                    "credential-A",

                recordingId:
                    "recording-B"
            });

        assert.deepEqual(
            repositoryCall,
            {
                facilityId:
                    "facility-A",

                recordingId:
                    "recording-B"
            }
        );

        assert.equal(
            result.status,
            "not_found"
        );

        assert.equal(
            result.errorCode,
            "voice_recording_not_found"
        );

        assert.equal(
            storageFetchCalled,
            false
        );
    }
);
