"use strict";

class ConnectorResidentCandidateRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = fetch
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "ConnectorResidentCandidateRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "ConnectorResidentCandidateRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "ConnectorResidentCandidateRepository requires accessTokenProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "ConnectorResidentCandidateRepository requires fetchImpl"
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

        this.fetchImpl =
            fetchImpl;
    }

    async getCandidates({
        verifiedFacilityId,
        verifiedConnectorId,
        userCode,
        name
    } = {}) {
        const facilityId =
            String(verifiedFacilityId || "").trim();

        const connectorId =
            String(verifiedConnectorId || "").trim();

        const normalizedUserCode =
            String(userCode || "").trim();

        const normalizedName =
            String(name || "").trim();

        if (
            !facilityId ||
            !connectorId ||
            (
                !normalizedUserCode &&
                !normalizedName
            ) ||
            (
                normalizedUserCode &&
                normalizedName
            )
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
                "Connector resident candidate lookup requires access token"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/get_connector_resident_candidates_v2`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization":
                            `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            facilityId,
                        p_connector_id:
                            connectorId,
                        p_user_code:
                            normalizedUserCode || null,
                        p_name:
                            normalizedName || null
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase connector resident candidate lookup failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase connector resident candidate lookup returned invalid result"
            );
        }

        return result.map(row => ({
            residentId:
                row.resident_id,
            userCode:
                row.user_code,
            name:
                row.name,
            kana:
                row.kana ?? null,
            birthDate:
                row.birth_date ?? null
        }));
    }
}

module.exports =
    ConnectorResidentCandidateRepository;
