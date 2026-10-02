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
            "test-audio"
        )
    ]);
}


function validInput() {
    const data =
        waveData();

    return {
        recordingUuid:
            "recording-A",

        conversationUuid:
            "CON-A",

        facilityId:
            "11111111-1111-1111-1111-111111111111",

        caseId:
            "22222222-2222-2222-2222-222222222222",

        contactId:
            "33333333-3333-3333-3333-333333333333",

        communicationLogId:
            "44444444-4444-4444-4444-444444444444",

        data,

        size:
            data.length,

        contentType:
            "audio/wave"
    };
}


function createStore({
    token =
        "test-access-token",
    fetchImpl
} = {}) {
    return new SupabaseVoiceRecordingStore({
        supabaseUrl:
            "https://example.supabase.co",

        apiKey:
            "test-api-key",

        accessTokenProvider: {
            async getAccessToken() {
                return token;
            }
        },

        fetchImpl:
            fetchImpl ||
            (async () => {
                throw new Error(
                    "unexpected fetch"
                );
            })
    });
}


test(
    "prepares uploads and finalizes a WAV recording",
    async () => {
        const calls = [];

        const input =
            validInput();

        const expectedPath =
            `${input.facilityId}/` +
            `${input.communicationLogId}/` +
            `${input.recordingUuid}.wav`;

        const recordingId =
            "55555555-5555-5555-5555-555555555555";

        const store =
            createStore({
                fetchImpl:
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
                                "/rest/v1/rpc/prepare_voice_recording_storage"
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
                                "/storage/v1/object/communication-recordings/"
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
                                "/rest/v1/rpc/finalize_voice_recording_storage"
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

                        throw new Error(
                            "unexpected fetch"
                        );
                    }
            });

        const result =
            await store.save(
                input
            );

        assert.deepEqual(
            result,
            {
                storageReference:
                    `communication-recordings/${expectedPath}`
            }
        );

        assert.equal(
            calls.length,
            3
        );

        assert.equal(
            calls[0].options.method,
            "POST"
        );

        assert.deepEqual(
            JSON.parse(
                calls[0].options.body
            ),
            {
                p_facility_id:
                    input.facilityId,

                p_case_id:
                    input.caseId,

                p_contact_id:
                    input.contactId,

                p_communication_log_id:
                    input.communicationLogId,

                p_provider_recording_id:
                    input.recordingUuid,

                p_mime_type:
                    "audio/wave",

                p_size_bytes:
                    input.size
            }
        );

        assert.equal(
            calls[1].options.method,
            "POST"
        );

        assert.equal(
            calls[1].options.headers[
                "Content-Type"
            ],
            "audio/wave"
        );

        assert.deepEqual(
            calls[1].options.body,
            input.data
        );

        assert.equal(
            calls[1].options.headers.Authorization,
            "Bearer test-access-token"
        );
    }
);


test(
    "returns an already uploaded recording without uploading again",
    async () => {
        let uploadCalled =
            false;

        const input =
            validInput();

        const expectedPath =
            `${input.facilityId}/` +
            `${input.communicationLogId}/` +
            `${input.recordingUuid}.wav`;

        const store =
            createStore({
                fetchImpl:
                    async (
                        url
                    ) => {
                        if (
                            url.endsWith(
                                "/rest/v1/rpc/prepare_voice_recording_storage"
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
                                            "55555555-5555-5555-5555-555555555555",

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

                        uploadCalled =
                            true;

                        throw new Error(
                            "must not upload"
                        );
                    }
            });

        const result =
            await store.save(
                input
            );

        assert.equal(
            uploadCalled,
            false
        );

        assert.equal(
            result.storageReference,
            `communication-recordings/${expectedPath}`
        );
    }
);


test(
    "rejects invalid WAV payload before authentication or fetch",
    async () => {
        let tokenCalled =
            false;

        let fetchCalled =
            false;

        const store =
            new SupabaseVoiceRecordingStore({
                supabaseUrl:
                    "https://example.supabase.co",

                apiKey:
                    "test-api-key",

                accessTokenProvider: {
                    async getAccessToken() {
                        tokenCalled =
                            true;

                        return "token";
                    }
                },

                fetchImpl:
                    async () => {
                        fetchCalled =
                            true;

                        return {};
                    }
            });

        await assert.rejects(
            () =>
                store.save({
                    ...validInput(),

                    data:
                        Buffer.from(
                            "not-a-wave"
                        ),

                    size:
                        Buffer.byteLength(
                            "not-a-wave"
                        )
                }),
            /wave_invalid/
        );

        assert.equal(
            tokenCalled,
            false
        );

        assert.equal(
            fetchCalled,
            false
        );
    }
);


test(
    "rejects an unsafe prepare result",
    async () => {
        const store =
            createStore({
                fetchImpl:
                    async () => ({
                        ok:
                            true,

                        status:
                            200,

                        async json() {
                            return [{
                                recording_id:
                                    "55555555-5555-5555-5555-555555555555",

                                storage_bucket:
                                    "wrong-bucket",

                                storage_path:
                                    "wrong/path.wav",

                                upload_status:
                                    "pending"
                            }];
                        }
                    })
            });

        await assert.rejects(
            () =>
                store.save(
                    validInput()
                ),
            /prepare returned invalid result/
        );
    }
);


test(
    "does not read private response body on upload failure",
    async () => {
        const input =
            validInput();

        const expectedPath =
            `${input.facilityId}/` +
            `${input.communicationLogId}/` +
            `${input.recordingUuid}.wav`;

        let callCount =
            0;

        const store =
            createStore({
                fetchImpl:
                    async () => {
                        callCount +=
                            1;

                        if (
                            callCount ===
                            1
                        ) {
                            return {
                                ok:
                                    true,

                                status:
                                    200,

                                async json() {
                                    return [{
                                        recording_id:
                                            "55555555-5555-5555-5555-555555555555",

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

                        return {
                            ok:
                                false,

                            status:
                                500,

                            async json() {
                                throw new Error(
                                    "private-body-must-not-be-read"
                                );
                            },

                            async text() {
                                throw new Error(
                                    "private-body-must-not-be-read"
                                );
                            }
                        };
                    }
            });

        let caught =
            null;

        try {
            await store.save(
                input
            );
        } catch (error) {
            caught =
                error;
        }

        assert.ok(caught);

        assert.equal(
            caught.httpStatus,
            500
        );

        assert.equal(
            caught.storagePhase,
            "upload"
        );

        assert.equal(
            caught.message.includes(
                "private-body-must-not-be-read"
            ),
            false
        );
    }
);


test(
    "recovers when the object already exists before finalize",
    async () => {
        const input =
            validInput();

        const expectedPath =
            `${input.facilityId}/` +
            `${input.communicationLogId}/` +
            `${input.recordingUuid}.wav`;

        let callCount =
            0;

        const recordingId =
            "55555555-5555-5555-5555-555555555555";

        const store =
            createStore({
                fetchImpl:
                    async () => {
                        callCount +=
                            1;

                        if (
                            callCount ===
                            1
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
                            callCount ===
                            2
                        ) {
                            return {
                                ok:
                                    false,

                                status:
                                    400
                            };
                        }

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
            });

        const result =
            await store.save(
                input
            );

        assert.equal(
            callCount,
            3
        );

        assert.equal(
            result.storageReference,
            `communication-recordings/${expectedPath}`
        );
    }
);
