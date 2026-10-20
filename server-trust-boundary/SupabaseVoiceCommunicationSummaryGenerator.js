"use strict";

class SupabaseVoiceCommunicationSummaryGenerator {
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
                "SupabaseVoiceCommunicationSummaryGenerator requires Supabase configuration"
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

    async generate({
        transcript
    } = {}) {
        const normalizedTranscript =
            String(
                transcript || ""
            ).trim();

        if (!normalizedTranscript) {
            throw new TypeError(
                "voice communication transcript is required"
            );
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/functions/v1/voice-communication-summary-generator`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            this.apiKey,

                        Authorization:
                            `Bearer ${accessToken.trim()}`
                    },

                    body:
                        JSON.stringify({
                            transcript:
                                normalizedTranscript
                        })
                }
            );

        const responseText =
            await response.text();

        if (!response.ok) {
            throw new Error(
                `voice communication summary generation failed: ${response.status} ${responseText}`
            );
        }

        let body;

        try {
            body =
                JSON.parse(
                    responseText
                );
        } catch {
            throw new Error(
                "voice communication summary generator returned invalid JSON"
            );
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            body.status !== "generated" ||
            typeof body.summary !== "string" ||
            !body.summary.trim()
        ) {
            throw new Error(
                "voice communication summary generator returned invalid result"
            );
        }

        return body.summary.trim();
    }
}

module.exports =
    SupabaseVoiceCommunicationSummaryGenerator;
