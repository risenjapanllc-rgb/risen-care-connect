"use strict";

class SupabaseVoiceRecordingStore {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl =
            globalThis.fetch
    } = {}) {
        if (
            typeof supabaseUrl !==
                "string" ||
            !supabaseUrl.trim() ||
            typeof apiKey !==
                "string" ||
            !apiKey.trim() ||
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function" ||
            typeof fetchImpl !==
                "function"
        ) {
            throw new Error(
                "SupabaseVoiceRecordingStore requires Supabase configuration"
            );
        }

        this.supabaseUrl =
            supabaseUrl
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            apiKey.trim();

        this.accessTokenProvider =
            accessTokenProvider;

        this.fetchImpl =
            fetchImpl;
    }

    createHttpError(
        message,
        response,
        phase
    ) {
        const error =
            new Error(message);

        error.httpStatus =
            response &&
            Number.isInteger(
                response.status
            )
                ? response.status
                : null;

        error.storagePhase =
            phase;

        return error;
    }

    validateWave({
        data,
        size,
        contentType
    }) {
        if (
            !Buffer.isBuffer(data) ||
            !Number.isSafeInteger(size) ||
            size <= 0 ||
            data.length !== size ||
            size >
                25 * 1024 * 1024
        ) {
            throw new Error(
                "voice_recording_storage_payload_invalid"
            );
        }

        const normalizedContentType =
            String(
                contentType || ""
            )
                .split(";")[0]
                .trim()
                .toLowerCase();

        if (
            normalizedContentType !==
            "audio/wave"
        ) {
            throw new Error(
                "voice_recording_storage_content_type_invalid"
            );
        }

        if (
            data.length < 12 ||
            data.subarray(
                0,
                4
            ).toString("ascii") !==
                "RIFF" ||
            data.subarray(
                8,
                12
            ).toString("ascii") !==
                "WAVE"
        ) {
            throw new Error(
                "voice_recording_storage_wave_invalid"
            );
        }
    }

    buildObjectUrl({
        bucket,
        path
    }) {
        const encodedBucket =
            encodeURIComponent(
                bucket
            );

        const encodedPath =
            path
                .split("/")
                .map(
                    segment =>
                        encodeURIComponent(
                            segment
                        )
                )
                .join("/");

        return (
            `${this.supabaseUrl}` +
            `/storage/v1/object/` +
            `${encodedBucket}/` +
            `${encodedPath}`
        );
    }

    async save({
        recordingUuid,
        conversationUuid,
        facilityId,
        caseId,
        contactId,
        communicationLogId,
        startTime,
        endTime,
        data,
        size,
        contentType
    } = {}) {
        const normalizedRecordingUuid =
            String(
                recordingUuid || ""
            ).trim();

        const normalizedConversationUuid =
            String(
                conversationUuid || ""
            ).trim();

        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        const normalizedCaseId =
            String(
                caseId || ""
            ).trim();

        const normalizedContactId =
            String(
                contactId || ""
            ).trim();

        const normalizedCommunicationLogId =
            String(
                communicationLogId || ""
            ).trim();

        const normalizedStartTime =
            String(
                startTime || ""
            ).trim();

        const normalizedEndTime =
            String(
                endTime || ""
            ).trim();

        const timingRequested =
            Boolean(
                normalizedStartTime ||
                normalizedEndTime
            );

        if (
            timingRequested &&
            (
                !normalizedStartTime ||
                !normalizedEndTime ||
                !Number.isFinite(
                    Date.parse(
                        normalizedStartTime
                    )
                ) ||
                !Number.isFinite(
                    Date.parse(
                        normalizedEndTime
                    )
                ) ||
                Date.parse(
                    normalizedEndTime
                ) <
                    Date.parse(
                        normalizedStartTime
                    )
            )
        ) {
            throw new Error(
                "voice_recording_storage_timing_invalid"
            );
        }

        if (
            !normalizedRecordingUuid ||
            !/^[A-Za-z0-9_-]+$/.test(
                normalizedRecordingUuid
            ) ||
            normalizedRecordingUuid.length >
                128 ||
            !normalizedConversationUuid ||
            !normalizedFacilityId ||
            !normalizedCaseId ||
            !normalizedContactId ||
            !normalizedCommunicationLogId
        ) {
            throw new Error(
                "voice_recording_storage_input_invalid"
            );
        }

        this.validateWave({
            data,
            size,
            contentType
        });

        const expectedBucket =
            "communication-recordings";

        const expectedPath =
            `${normalizedFacilityId}/` +
            `${normalizedCommunicationLogId}/` +
            `${normalizedRecordingUuid}.wav`;

        const token =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof token !==
                "string" ||
            !token.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        const authorization =
            `Bearer ${token.trim()}`;

        const commonHeaders = {
            apikey:
                this.apiKey,

            Authorization:
                authorization
        };

        const prepareResponse =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/prepare_voice_recording_storage`,
                {
                    method:
                        "POST",

                    headers: {
                        ...commonHeaders,

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            p_facility_id:
                                normalizedFacilityId,

                            p_case_id:
                                normalizedCaseId,

                            p_contact_id:
                                normalizedContactId,

                            p_communication_log_id:
                                normalizedCommunicationLogId,

                            p_provider_recording_id:
                                normalizedRecordingUuid,

                            p_mime_type:
                                "audio/wave",

                            p_size_bytes:
                                size
                        })
                }
            );

        if (!prepareResponse.ok) {
            throw this.createHttpError(
                "Supabase voice recording prepare failed",
                prepareResponse,
                "prepare"
            );
        }

        const prepared =
            await prepareResponse.json();

        if (
            !Array.isArray(prepared) ||
            prepared.length !== 1 ||
            !prepared[0] ||
            typeof prepared[0] !==
                "object" ||
            typeof prepared[0].recording_id !==
                "string" ||
            !prepared[0].recording_id.trim() ||
            prepared[0].storage_bucket !==
                expectedBucket ||
            prepared[0].storage_path !==
                expectedPath ||
            ![
                "pending",
                "uploaded"
            ].includes(
                prepared[0].upload_status
            )
        ) {
            throw new Error(
                "Supabase voice recording prepare returned invalid result"
            );
        }

        const recordingId =
            prepared[0]
                .recording_id
                .trim();

        const storageReference =
            `${expectedBucket}/${expectedPath}`;

        const persistTiming =
            async () => {
                if (!timingRequested) {
                    return null;
                }

                const timingResponse =
                    await this.fetchImpl(
                        `${this.supabaseUrl}/rest/v1/rpc/update_voice_recording_timing`,
                        {
                            method:
                                "POST",

                            headers: {
                                ...commonHeaders,

                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    p_recording_id:
                                        recordingId,

                                    p_facility_id:
                                        normalizedFacilityId,

                                    p_provider_recording_id:
                                        normalizedRecordingUuid,

                                    p_started_at:
                                        normalizedStartTime,

                                    p_ended_at:
                                        normalizedEndTime
                                })
                        }
                    );

                if (!timingResponse.ok) {
                    throw this.createHttpError(
                        "Supabase voice recording timing failed",
                        timingResponse,
                        "timing"
                    );
                }

                const timed =
                    await timingResponse.json();

                if (
                    !Array.isArray(timed) ||
                    timed.length !== 1 ||
                    !timed[0] ||
                    typeof timed[0] !==
                        "object" ||
                    timed[0].status !==
                        "timed" ||
                    timed[0].recording_id !==
                        recordingId
                ) {
                    throw new Error(
                        "Supabase voice recording timing returned invalid result"
                    );
                }

                const durationMs =
                    Number(
                        timed[0].duration_ms
                    );

                if (
                    !Number.isSafeInteger(
                        durationMs
                    ) ||
                    durationMs < 0
                ) {
                    throw new Error(
                        "Supabase voice recording timing returned invalid duration"
                    );
                }

                return durationMs;
            };

        if (
            prepared[0].upload_status ===
            "uploaded"
        ) {
            const durationMs =
                await persistTiming();

            return {
                storageReference,
                ...(durationMs === null
                    ? {}
                    : {
                        durationMs
                    })
            };
        }

        const uploadResponse =
            await this.fetchImpl(
                this.buildObjectUrl({
                    bucket:
                        expectedBucket,

                    path:
                        expectedPath
                }),
                {
                    method:
                        "POST",

                    headers: {
                        ...commonHeaders,

                        "Content-Type":
                            "audio/wave"
                    },

                    body:
                        data
                }
            );

        /*
         * 400 / 409 can represent an object that already exists.
         * This can occur if upload succeeded but finalize was
         * interrupted. Finalize itself verifies the exact object.
         */
        if (
            !uploadResponse.ok &&
            uploadResponse.status !== 400 &&
            uploadResponse.status !== 409
        ) {
            throw this.createHttpError(
                "Supabase voice recording upload failed",
                uploadResponse,
                "upload"
            );
        }

        const finalizeResponse =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/finalize_voice_recording_storage`,
                {
                    method:
                        "POST",

                    headers: {
                        ...commonHeaders,

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            p_recording_id:
                                recordingId,

                            p_facility_id:
                                normalizedFacilityId,

                            p_provider_recording_id:
                                normalizedRecordingUuid,

                            p_storage_path:
                                expectedPath
                        })
                }
            );

        if (!finalizeResponse.ok) {
            throw this.createHttpError(
                "Supabase voice recording finalize failed",
                finalizeResponse,
                "finalize"
            );
        }

        const finalized =
            await finalizeResponse.json();

        if (
            !Array.isArray(finalized) ||
            finalized.length !== 1 ||
            !finalized[0] ||
            typeof finalized[0] !==
                "object" ||
            finalized[0].status !==
                "uploaded" ||
            finalized[0].recording_id !==
                recordingId ||
            finalized[0].storage_reference !==
                storageReference
        ) {
            throw new Error(
                "Supabase voice recording finalize returned invalid result"
            );
        }

        const durationMs =
            await persistTiming();

        return {
            storageReference,
            ...(durationMs === null
                ? {}
                : {
                    durationMs
                })
        };
    }
}

module.exports =
    SupabaseVoiceRecordingStore;
