"use strict";

class SupabaseVoiceRecordingPlaybackRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = globalThis.fetch
    } = {}) {
        if (
            typeof supabaseUrl !== "string" ||
            !supabaseUrl.trim() ||
            typeof apiKey !== "string" ||
            !apiKey.trim() ||
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseVoiceRecordingPlaybackRepository requires Supabase configuration"
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

    async accessToken() {
        const token =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof token !== "string" ||
            !token.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        return token.trim();
    }

    async findByFacilityAndRecording({
        facilityId,
        recordingId
    } = {}) {
        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        const normalizedRecordingId =
            String(
                recordingId || ""
            ).trim();

        if (
            !normalizedFacilityId ||
            !normalizedRecordingId
        ) {
            throw new TypeError(
                "voice recording playback lookup input is invalid"
            );
        }

        const token =
            await this.accessToken();

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/get_voice_recording_playback`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            this.apiKey,

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify({
                            p_facility_id:
                                normalizedFacilityId,

                            p_recording_id:
                                normalizedRecordingId
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase voice recording playback request failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase voice recording playback returned invalid result"
            );
        }

        if (rows.length === 0) {
            return null;
        }

        if (rows.length !== 1) {
            throw new Error(
                "Supabase voice recording playback returned multiple results"
            );
        }

        const recording =
            rows[0];

        if (
            !recording ||
            typeof recording !== "object" ||
            Array.isArray(recording)
        ) {
            throw new Error(
                "Supabase voice recording playback returned invalid recording"
            );
        }

        if (
            recording.recording_id !==
                normalizedRecordingId
        ) {
            throw new Error(
                "voice recording playback identity mismatch"
            );
        }

        return {
            recordingId:
                recording.recording_id,

            communicationLogId:
                recording.communication_log_id,

            storageBucket:
                recording.storage_bucket,

            storagePath:
                recording.storage_path,

            durationMs:
                recording.duration_ms,

            transcriptionStatus:
                recording.transcription_status,

            transcriptionText:
                recording.transcription_text
        };
    }
}

module.exports =
    SupabaseVoiceRecordingPlaybackRepository;
