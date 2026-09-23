"use strict";

/**
 * Supabase Facility Phone Number Repository
 *
 * Responsibility:
 * - retrieve active Vonage phone number for a verified facility
 * - use the same REST + RPC pattern as existing repositories
 * - require an authenticated Supabase access token
 */
class SupabaseFacilityPhoneNumberRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseFacilityPhoneNumberRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseFacilityPhoneNumberRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseFacilityPhoneNumberRepository requires accessTokenProvider"
            );
        }

        this.supabaseUrl =
            String(supabaseUrl)
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            String(apiKey).trim();

        this.accessTokenProvider =
            accessTokenProvider;
    }

    async findActiveByFacilityId(
        facilityId
    ) {
        const normalizedFacilityId =
            String(
                facilityId || ""
            ).trim();

        if (!normalizedFacilityId) {
            return null;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase facility phone lookup requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_facility_phone_number`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "apikey":
                            this.apiKey,

                        "Authorization":
                            `Bearer ${accessToken}`
                    },

                    body: JSON.stringify({
                        p_facility_id:
                            normalizedFacilityId
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase facility phone lookup failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase facility phone lookup returned invalid result"
            );
        }

        if (result.length === 0) {
            return null;
        }

        if (result.length !== 1) {
            throw new Error(
                "Supabase facility phone lookup returned multiple active numbers"
            );
        }

        const row =
            result[0];

        if (
            !row ||
            typeof row !== "object" ||
            Array.isArray(row)
        ) {
            throw new Error(
                "Supabase facility phone lookup returned invalid number"
            );
        }

        return {
            id:
                row.id,

            facilityId:
                row.facility_id,

            phoneNumber:
                row.phone_number,

            provider:
                row.provider,

            status:
                row.status,

            createdAt:
                row.created_at,

            updatedAt:
                row.updated_at
        };
    }
}

module.exports = {
    SupabaseFacilityPhoneNumberRepository
};
