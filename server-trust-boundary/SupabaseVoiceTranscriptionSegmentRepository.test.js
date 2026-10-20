"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseVoiceTranscriptionSegmentRepository =
    require(
        "./SupabaseVoiceTranscriptionSegmentRepository"
    );


function createRepository({
    response
} = {}) {
    return new SupabaseVoiceTranscriptionSegmentRepository({
        supabaseUrl:
            "https://example.supabase.co",

        apiKey:
            "test-key",

        accessTokenProvider: {
            getAccessToken:
                async () =>
                    "test-token"
        },

        fetchImpl:
            async () =>
                response
    });
}


test(
    "reads trusted voice transcription segments",
    async () => {
        let request;

        const repository =
            new SupabaseVoiceTranscriptionSegmentRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-key",

                accessTokenProvider: {
                    getAccessToken:
                        async () =>
                            "test-token"
                },

                fetchImpl:
                    async (url, options) => {
                        request = {
                            url,
                            options
                        };

                        return {
                            ok:
                                true,

                            status:
                                200,

                            text:
                                async () =>
                                    JSON.stringify([
                                        {
                                            segment_index:
                                                0,

                                            start_ms:
                                                0,

                                            end_ms:
                                                7000,

                                            transcript_text:
                                                "昼食は半分でした。"
                                        }
                                    ])
                        };
                    }
            });

        const result =
            await repository.list({
                facilityId:
                    "facility-1",

                recordingId:
                    "recording-1"
            });

        assert.deepStrictEqual(
            result,
            [
                {
                    recordingId:
                        "recording-1",

                    segmentIndex:
                        0,

                    startMs:
                        0,

                    endMs:
                        7000,

                    transcriptText:
                        "昼食は半分でした。"
                }
            ]
        );

        assert.equal(
            request.url,
            "https://example.supabase.co/rest/v1/rpc/get_voice_transcription_segments"
        );

        assert.deepStrictEqual(
            JSON.parse(
                request.options.body
            ),
            {
                p_facility_id:
                    "facility-1",

                p_recording_id:
                    "recording-1"
            }
        );
    }
);


test(
    "returns empty array when recording has no segments",
    async () => {
        const repository =
            createRepository({
                response: {
                    ok:
                        true,

                    status:
                        200,

                    text:
                        async () =>
                            "[]"
                }
            });

        assert.deepStrictEqual(
            await repository.list({
                facilityId:
                    "facility-1",

                recordingId:
                    "recording-1"
            }),
            []
        );
    }
);


test(
    "rejects invalid lookup input before request",
    async () => {
        let fetchCalled =
            false;

        const repository =
            new SupabaseVoiceTranscriptionSegmentRepository({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-key",

                accessTokenProvider: {
                    getAccessToken:
                        async () =>
                            "test-token"
                },

                fetchImpl:
                    async () => {
                        fetchCalled =
                            true;

                        throw new Error(
                            "must not fetch"
                        );
                    }
            });

        await assert.rejects(
            () =>
                repository.list({
                    facilityId:
                        "",

                    recordingId:
                        "recording-1"
                }),
            TypeError
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);


test(
    "rejects invalid segment returned by database",
    async () => {
        const repository =
            createRepository({
                response: {
                    ok:
                        true,

                    status:
                        200,

                    text:
                        async () =>
                            JSON.stringify([
                                {
                                    segment_index:
                                        0,

                                    start_ms:
                                        7000,

                                    end_ms:
                                        1000,

                                    transcript_text:
                                        "invalid"
                                }
                            ])
                }
            });

        await assert.rejects(
            () =>
                repository.list({
                    facilityId:
                        "facility-1",

                    recordingId:
                        "recording-1"
                }),
            /invalid segment/
        );
    }
);


test(
    "rejects failed RPC response",
    async () => {
        const repository =
            createRepository({
                response: {
                    ok:
                        false,

                    status:
                        404,

                    text:
                        async () =>
                            "not found"
                }
            });

        await assert.rejects(
            () =>
                repository.list({
                    facilityId:
                        "facility-1",

                    recordingId:
                        "recording-1"
                }),
            /query failed/
        );
    }
);
