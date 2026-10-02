"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseVoiceRecordingStore =
    require("./SupabaseVoiceRecordingStore");


function waveData() {
    return Buffer.concat([
        Buffer.from(
            "RIFF",
            "ascii"
        ),
        Buffer.from([
            0,
            0,
            0,
            0
        ]),
        Buffer.from(
            "WAVE",
            "ascii"
        ),
        Buffer.from(
            "timing-test"
        )
    ]);
}


function input() {
    const data =
        waveData();

    return {
        recordingUuid:
            "recording-timing-A",

        conversationUuid:
            "CON-TIMING-A",

        facilityId:
            "11111111-1111-1111-1111-111111111111",

        caseId:
            "22222222-2222-2222-2222-222222222222",

        contactId:
            "33333333-3333-3333-3333-333333333333",

        communicationLogId:
            "44444444-4444-4444-4444-444444444444",

        startTime:
            "2026-10-02T00:00:00Z",

        endTime:
            "2026-10-02T00:00:30Z",

        data,

        size:
            data.length,

        contentType:
            "audio/wave"
    };
}


function createStore(fetchImpl) {
    return new SupabaseVoiceRecordingStore({
        supabaseUrl:
            "https://example.supabase.co",

        apiKey:
            "test-api-key",

        accessTokenProvider: {
            async getAccessToken() {
                return "test-access-token";
            }
        },

        fetchImpl
    });
}


test(
    "persists provider timing after a newly uploaded recording",
    async () => {
        const value =
            input();

        const recordingId =
            "55555555-5555-5555-5555-555555555555";

        const expectedPath =
            `${value.facilityId}/` +
            `${value.communicationLogId}/` +
            `${value.recordingUuid}.wav`;

        const calls = [];

        const store =
            createStore(
                async (
                    url,
                    options = {}
                ) => {
                    calls.push({
                        url,
                        options
                    });

                    if (
                        url.endsWith(
                            "/prepare_voice_recording_storage"
                        )
                    ) {
                        return {
                            ok:
                                true,
                            status:
                                200,
                            async json() {
                                return [{
                                    recording_id:
                                        recordingId,
                                    storage_bucket:
                                        "communication-recordings",
                                    storage_path:
                                        expectedPath,
                                    upload_status:
                                        "pending"
                                }];
                            }
                        };
                    }

                    if (
                        url.includes(
                            "/storage/v1/object/"
                        )
                    ) {
                        return {
                            ok:
                                true,
                            status:
                                200
                        };
                    }

                    if (
                        url.endsWith(
                            "/finalize_voice_recording_storage"
                        )
                    ) {
                        return {
                            ok:
                                true,
                            status:
                                200,
                            async json() {
                                return [{
                                    status:
                                        "uploaded",
                                    recording_id:
                                        recordingId,
                                    storage_reference:
                                        `communication-recordings/${expectedPath}`
                                }];
                            }
                        };
                    }

                    if (
                        url.endsWith(
                            "/update_voice_recording_timing"
                        )
                    ) {
                        const body =
                            JSON.parse(
                                options.body
                            );

                        assert.equal(
                            body.p_started_at,
                            value.startTime
                        );

                        assert.equal(
                            body.p_ended_at,
                            value.endTime
                        );

                        assert.equal(
                            body.p_recording_id,
                            recordingId
                        );

                        return {
                            ok:
                                true,
                            status:
                                200,
                            async json() {
                                return [{
                                    status:
                                        "timed",
                                    recording_id:
                                        recordingId,
                                    duration_ms:
                                        30000
                                }];
                            }
                        };
                    }

                    throw new Error(
                        "unexpected fetch"
                    );
                }
            );

        const result =
            await store.save(
                value
            );

        assert.equal(
            calls.length,
            4
        );

        assert.equal(
            result.durationMs,
            30000
        );
    }
);


test(
    "persists timing when the recording object was already uploaded",
    async () => {
        const value =
            input();

        const recordingId =
            "55555555-5555-5555-5555-555555555555";

        const expectedPath =
            `${value.facilityId}/` +
            `${value.communicationLogId}/` +
            `${value.recordingUuid}.wav`;

        const urls = [];

        const store =
            createStore(
                async (
                    url,
                    options = {}
                ) => {
                    urls.push(url);

                    if (
                        url.endsWith(
                            "/prepare_voice_recording_storage"
                        )
                    ) {
                        return {
                            ok:
                                true,
                            status:
                                200,
                            async json() {
                                return [{
                                    recording_id:
                                        recordingId,
                                    storage_bucket:
                                        "communication-recordings",
                                    storage_path:
                                        expectedPath,
                                    upload_status:
                                        "uploaded"
                                }];
                            }
                        };
                    }

                    if (
                        url.endsWith(
                            "/update_voice_recording_timing"
                        )
                    ) {
                        const body =
                            JSON.parse(
                                options.body
                            );

                        assert.equal(
                            body.p_provider_recording_id,
                            value.recordingUuid
                        );

                        return {
                            ok:
                                true,
                            status:
                                200,
                            async json() {
                                return [{
                                    status:
                                        "timed",
                                    recording_id:
                                        recordingId,
                                    duration_ms:
                                        30000
                                }];
                            }
                        };
                    }

                    throw new Error(
                        "unexpected fetch"
                    );
                }
            );

        const result =
            await store.save(
                value
            );

        assert.equal(
            urls.length,
            2
        );

        assert.equal(
            urls.some(
                url =>
                    url.includes(
                        "/storage/v1/object/"
                    )
            ),
            false
        );

        assert.equal(
            result.durationMs,
            30000
        );
    }
);
