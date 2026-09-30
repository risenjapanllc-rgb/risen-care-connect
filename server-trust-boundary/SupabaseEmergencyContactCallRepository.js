"use strict";

class SupabaseEmergencyContactCallRepository {
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
                "SupabaseEmergencyContactCallRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl =
            supabaseUrl.trim().replace(/\/+$/, "");

        this.apiKey =
            apiKey.trim();

        this.accessTokenProvider =
            accessTokenProvider;

        this.fetchImpl =
            fetchImpl;
    }

    async recordCallStarted({
        caseId,
        contactId,
        recordingSessionId
    } = {}) {
        if (
            typeof caseId !== "string" ||
            !caseId.trim()
        ) {
            throw new TypeError(
                "caseId is required"
            );
        }

        if (
            typeof contactId !== "string" ||
            !contactId.trim()
        ) {
            throw new TypeError(
                "contactId is required"
            );
        }

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

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/record_emergency_contact_call_started`,
                {
                    method: "POST",

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
                            p_case_id:
                                caseId.trim(),

                            p_contact_id:
                                contactId.trim(),

                            p_recording_session_id:
                                recordingSessionId
                                    ? recordingSessionId.trim()
                                    : null
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase emergency contact call request failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result)
        ) {
            throw new Error(
                "Supabase emergency contact call returned invalid result"
            );
        }

        return result;
    }
}

module.exports =
    SupabaseEmergencyContactCallRepository;
