"use strict";


class SupabaseVoiceTranscriptionSegmentRepository {
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
                "SupabaseVoiceTranscriptionSegmentRepository requires Supabase configuration"
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


    async list({
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
                "voice transcription segment lookup input is invalid"
            );
        }

        const token =
            await this.accessToken();

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/get_voice_transcription_segments`,
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

        const text =
            await response.text();

        if (!response.ok) {
            throw new Error(
                `Supabase voice transcription segment query failed: ${response.status} ${text}`
            );
        }

        let rows;

        try {
            rows =
                text.trim()
                    ? JSON.parse(text)
                    : [];
        } catch {
            throw new Error(
                "Supabase voice transcription segment query returned invalid JSON"
            );
        }

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase voice transcription segment query returned invalid result"
            );
        }

        return rows.map(
            row => {
                if (
                    !row ||
                    typeof row !== "object" ||
                    Array.isArray(row) ||
                    !Number.isInteger(
                        row.segment_index
                    ) ||
                    row.segment_index < 0 ||
                    !Number.isInteger(
                        row.start_ms
                    ) ||
                    row.start_ms < 0 ||
                    !Number.isInteger(
                        row.end_ms
                    ) ||
                    row.end_ms <
                        row.start_ms ||
                    typeof row.transcript_text !==
                        "string" ||
                    !row.transcript_text.trim()
                ) {
                    throw new Error(
                        "Supabase voice transcription segment query returned invalid segment"
                    );
                }

                return {
                    recordingId:
                        normalizedRecordingId,

                    segmentIndex:
                        row.segment_index,

                    startMs:
                        row.start_ms,

                    endMs:
                        row.end_ms,

                    transcriptText:
                        row.transcript_text
                };
            }
        );
    }
}


module.exports =
    SupabaseVoiceTranscriptionSegmentRepository;
