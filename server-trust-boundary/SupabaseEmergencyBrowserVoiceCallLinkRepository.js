"use strict";

class SupabaseEmergencyBrowserVoiceCallLinkRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = globalThis.fetch
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
                "SupabaseEmergencyBrowserVoiceCallLinkRepository requires Supabase configuration"
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

    async link({
        facilityId,
        caseId,
        contactId,
        voiceCallIntentId,
        communicationLogId
    } = {}) {
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

        const normalizedVoiceCallIntentId =
            String(
                voiceCallIntentId || ""
            ).trim();

        const normalizedCommunicationLogId =
            String(
                communicationLogId || ""
            ).trim();

        if (
            !normalizedFacilityId ||
            !normalizedCaseId ||
            !normalizedContactId ||
            !normalizedVoiceCallIntentId ||
            !normalizedCommunicationLogId
        ) {
            throw new TypeError(
                "emergency browser voice call link input is invalid"
            );
        }

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

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/link_emergency_browser_voice_call`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            this.apiKey,

                        Authorization:
                            `Bearer ${token.trim()}`
                    },

                    body:
                        JSON.stringify({
                            p_facility_id:
                                normalizedFacilityId,

                            p_case_id:
                                normalizedCaseId,

                            p_contact_id:
                                normalizedContactId,

                            p_voice_call_intent_id:
                                normalizedVoiceCallIntentId,

                            p_communication_log_id:
                                normalizedCommunicationLogId
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase emergency browser voice call link request failed: ${response.status}`
            );
        }

        return {
            status:
                "linked"
        };
    }
}

module.exports =
    SupabaseEmergencyBrowserVoiceCallLinkRepository;
