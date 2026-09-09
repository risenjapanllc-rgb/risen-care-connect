"use strict";

/**
 * Supabase Resident Repository
 *
 * v0.1:
 * - current facility-scoped candidates only
 * - no legacy facility_id IS NULL lookup
 * - no matching decision
 * - no connector credential handling
 * - authenticated connector_trust_boundary JWT required
 */
class SupabaseResidentRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseResidentRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseResidentRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseResidentRepository requires accessTokenProvider"
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

    async getCandidates({
        facilityId,
        sourceResidentIdentifier
    } = {}) {
        const normalizedFacilityId =
            String(facilityId || "").trim();

        const normalizedIdentifier =
            String(sourceResidentIdentifier || "").trim();

        if (
            !normalizedFacilityId ||
            !normalizedIdentifier
        ) {
            return [];
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase resident lookup requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_resident_candidates`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization": `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            normalizedFacilityId,
                        p_user_code:
                            normalizedIdentifier
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase resident lookup failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase resident lookup returned invalid result"
            );
        }

        return result.map((row) => ({
            id: row.id,
            facilityId: row.facility_id,
            userCode: row.user_code,
            name: row.name,
            gender: row.gender ?? null
        }));
    }
}

module.exports =
    SupabaseResidentRepository;
