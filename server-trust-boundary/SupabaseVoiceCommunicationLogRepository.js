"use strict";

class SupabaseVoiceCommunicationLogRepository {
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
                "SupabaseVoiceCommunicationLogRepository requires Supabase configuration"
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

    async createInbound({
        facilityId,
        fromPhone,
        toPhone,
        providerCallId
    } = {}) {
        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        const normalizedFromPhone =
            String(
                fromPhone || ""
            ).trim();

        const normalizedToPhone =
            String(
                toPhone || ""
            ).trim();

        const normalizedProviderCallId =
            String(
                providerCallId || ""
            ).trim();

        if (
            !normalizedFacilityId ||
            !normalizedFromPhone ||
            !normalizedToPhone ||
            !normalizedProviderCallId
        ) {
            throw new TypeError(
                "inbound voice communication log input is invalid"
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
                `${this.supabaseUrl}/rest/v1/rpc/create_inbound_voice_communication_log`,
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

                            p_from_phone:
                                normalizedFromPhone,

                            p_to_phone:
                                normalizedToPhone,

                            p_provider_call_id:
                                normalizedProviderCallId
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase inbound voice communication log request failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !==
                1 ||
            !result[0] ||
            typeof result[0] !==
                "object" ||
            typeof result[0]
                .communication_log_id !==
                "string" ||
            !result[0]
                .communication_log_id
                .trim()
        ) {
            throw new Error(
                "Supabase inbound voice communication log returned invalid result"
            );
        }

        return {
            communicationLogId:
                result[0]
                    .communication_log_id
                    .trim()
        };
    }

    async create({
        facilityId,
        caseId,
        contactId,
        providerCallId
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

        const normalizedProviderCallId =
            String(
                providerCallId || ""
            ).trim();

        if (
            !normalizedFacilityId ||
            !normalizedCaseId ||
            !normalizedContactId ||
            !normalizedProviderCallId
        ) {
            throw new TypeError(
                "voice communication log input is invalid"
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
                `${this.supabaseUrl}/rest/v1/rpc/create_voice_communication_log`,
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

                            p_provider_call_id:
                                normalizedProviderCallId
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase voice communication log request failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !==
                1 ||
            !result[0] ||
            typeof result[0] !==
                "object" ||
            typeof result[0]
                .communication_log_id !==
                "string" ||
            !result[0]
                .communication_log_id
                .trim()
        ) {
            throw new Error(
                "Supabase voice communication log returned invalid result"
            );
        }

        return {
            communicationLogId:
                result[0]
                    .communication_log_id
                    .trim()
        };
    }
}

module.exports =
    SupabaseVoiceCommunicationLogRepository;
