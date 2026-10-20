"use strict";

class SupabaseVoiceCommunicationRevisionRepository {
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
                "SupabaseVoiceCommunicationRevisionRepository requires Supabase configuration"
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

    async callRpc(
        rpcName,
        payload
    ) {
        const token =
            await this.accessToken();

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/${rpcName}`,
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
                        JSON.stringify(
                            payload || {}
                        )
                }
            );

        const text =
            await response.text();

        if (!response.ok) {
            throw new Error(
                `Supabase voice communication RPC failed: ${rpcName} ${response.status} ${text}`
            );
        }

        if (!text.trim()) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    async getCurrent({
        facilityId,
        communicationLogId
    } = {}) {
        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        const normalizedCommunicationLogId =
            String(
                communicationLogId || ""
            ).trim();

        if (
            !normalizedFacilityId ||
            !normalizedCommunicationLogId
        ) {
            throw new TypeError(
                "voice communication revision lookup input is invalid"
            );
        }

        const result =
            await this.callRpc(
                "get_voice_communication_revision_state",
                {
                    p_facility_id:
                        normalizedFacilityId,

                    p_communication_log_id:
                        normalizedCommunicationLogId
                }
            );

        const rows =
            Array.isArray(result)
                ? result
                : result
                  ? [result]
                  : [];

        if (rows.length === 0) {
            return null;
        }

        if (rows.length !== 1) {
            throw new Error(
                "voice communication revision state returned multiple results"
            );
        }

        const row =
            rows[0];

        if (
            !row ||
            typeof row !== "object" ||
            Array.isArray(row)
        ) {
            throw new Error(
                "voice communication revision state returned invalid result"
            );
        }

        return {
            communicationLogId:
                row.communication_log_id,

            transcript:
                row.transcript,

            aiSummary:
                row.ai_summary,

            confirmedSummary:
                row.confirmed_summary
        };
    }

    async reviseTranscript({
        facilityId,
        communicationLogId,
        transcript,
        revisedByName,
        revisionReason
    } = {}) {
        return await this.callRpc(
            "revise_voice_communication_transcript",
            {
                p_facility_id:
                    facilityId,

                p_communication_log_id:
                    communicationLogId,

                p_new_transcript:
                    transcript,

                p_revised_by_name:
                    revisedByName || null,

                p_revision_reason:
                    revisionReason
            }
        );
    }

    async persistAiSummary({
        facilityId,
        communicationLogId,
        sourceTranscript,
        aiSummary
    } = {}) {
        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        const normalizedCommunicationLogId =
            String(
                communicationLogId || ""
            ).trim();

        const normalizedSourceTranscript =
            String(
                sourceTranscript || ""
            ).trim();

        const normalizedAiSummary =
            String(
                aiSummary || ""
            ).trim();

        if (
            !normalizedFacilityId ||
            !normalizedCommunicationLogId ||
            !normalizedSourceTranscript ||
            !normalizedAiSummary
        ) {
            throw new TypeError(
                "voice communication AI summary persistence input is invalid"
            );
        }

        const result =
            await this.callRpc(
                "persist_voice_communication_ai_summary_if_transcript_matches",
                {
                    p_facility_id:
                        normalizedFacilityId,

                    p_communication_log_id:
                        normalizedCommunicationLogId,

                    p_source_transcript:
                        normalizedSourceTranscript,

                    p_ai_summary:
                        normalizedAiSummary
                }
            );

        if (
            result !== true &&
            result !== false
        ) {
            throw new Error(
                "voice communication AI summary CAS returned invalid result"
            );
        }

        return result;
    }

    async confirmSummary({
        facilityId,
        communicationLogId,
        confirmedSummary,
        revisedByName,
        revisionReason
    } = {}) {
        return await this.callRpc(
            "confirm_voice_communication_summary",
            {
                p_facility_id:
                    facilityId,

                p_communication_log_id:
                    communicationLogId,

                p_confirmed_summary:
                    confirmedSummary,

                p_revised_by_name:
                    revisedByName || null,

                p_revision_reason:
                    revisionReason
            }
        );
    }
}

module.exports =
    SupabaseVoiceCommunicationRevisionRepository;
