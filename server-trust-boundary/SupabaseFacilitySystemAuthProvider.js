"use strict";

/**
 * Supabase Facility System Auth Provider
 *
 * - authenticates dedicated RISEN facility_system machine account
 * - caches access token in memory
 * - never logs credentials or tokens
 */
class SupabaseFacilitySystemAuthProvider {
    constructor({
        supabaseUrl,
        apiKey,
        email,
        password
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseFacilitySystemAuthProvider requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseFacilitySystemAuthProvider requires apiKey"
            );
        }

        if (!email) {
            throw new Error(
                "SupabaseFacilitySystemAuthProvider requires email"
            );
        }

        if (!password) {
            throw new Error(
                "SupabaseFacilitySystemAuthProvider requires password"
            );
        }

        this.supabaseUrl =
            String(supabaseUrl)
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            String(apiKey).trim();

        this.email =
            String(email).trim();

        this.password =
            String(password);

        this.cachedAccessToken = null;
        this.expiresAt = 0;
    }

    async getAccessToken() {
        const now = Date.now();

        if (
            this.cachedAccessToken &&
            now < this.expiresAt
        ) {
            return this.cachedAccessToken;
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/auth/v1/token?grant_type=password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            this.apiKey
                    },

                    body:
                        JSON.stringify({
                            email:
                                this.email,

                            password:
                                this.password
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase facility system authentication failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !result ||
            typeof result.access_token !==
                "string" ||
            !result.access_token
        ) {
            throw new Error(
                "Supabase facility system authentication returned invalid result"
            );
        }

        const expiresIn =
            Number(
                result.expires_in
            ) || 3600;

        this.cachedAccessToken =
            result.access_token;

        this.expiresAt =
            now +
            Math.max(
                0,
                expiresIn - 60
            ) * 1000;

        return this.cachedAccessToken;
    }
}

module.exports =
    SupabaseFacilitySystemAuthProvider;
