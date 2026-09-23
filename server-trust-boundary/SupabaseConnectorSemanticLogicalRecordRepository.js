"use strict";

class SupabaseConnectorSemanticLogicalRecordRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = fetch
    } = {}) {
        if (!supabaseUrl || !apiKey) {
            throw new Error("SupabaseConnectorSemanticLogicalRecordRepository requires Supabase configuration");
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error("SupabaseConnectorSemanticLogicalRecordRepository requires accessTokenProvider");
        }

        if (typeof fetchImpl !== "function") {
            throw new Error("SupabaseConnectorSemanticLogicalRecordRepository requires fetchImpl");
        }

        this.supabaseUrl =
            String(supabaseUrl).trim().replace(/\/+$/, "");
        this.apiKey = String(apiKey).trim();
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;
    }

    async get({
        facilityId,
        connectorId,
        residentId,
        semanticType,
        logicalSlot
    } = {}) {
        const values = [
            facilityId,
            connectorId,
            residentId,
            semanticType,
            logicalSlot
        ];

        if (
            values.some(
                value =>
                    typeof value !== "string" ||
                    !value.trim()
            )
        ) {
            throw new TypeError("valid logical semantic lookup scope is required");
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error("Supabase logical semantic lookup requires access token");
        }

        const response =
            await this.fetchImpl(
                this.supabaseUrl +
                    "/rest/v1/rpc/get_connector_semantic_logical_record",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": this.apiKey,
                        "Authorization": "Bearer " + accessToken
                    },
                    body: JSON.stringify({
                        p_facility_id: facilityId.trim(),
                        p_connector_id: connectorId.trim(),
                        p_resident_id: residentId.trim(),
                        p_semantic_type: semanticType.trim(),
                        p_logical_slot: logicalSlot.trim()
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                "Supabase logical semantic lookup failed: " +
                response.status
            );
        }

        const result = await response.json();

        if (!Array.isArray(result) || result.length > 1) {
            throw new Error("Supabase logical semantic lookup returned invalid result");
        }

        if (result.length === 0) {
            return null;
        }

        const row = result[0];

        if (
            !row ||
            typeof row !== "object" ||
            typeof row.record_id !== "string" ||
            !row.record_id.trim() ||
            !row.semantic_content ||
            typeof row.semantic_content !== "object" ||
            Array.isArray(row.semantic_content) ||
            typeof row.content_hash !== "string" ||
            !/^[0-9a-f]{64}$/.test(row.content_hash) ||
            typeof row.canonicalization_version !== "string" ||
            !row.canonicalization_version.trim()
        ) {
            throw new Error("Supabase logical semantic lookup returned invalid record");
        }

        return {
            recordId: row.record_id.trim(),
            semanticContent: row.semantic_content,
            contentHash: row.content_hash,
            canonicalizationVersion:
                row.canonicalization_version.trim()
        };
    }
}

module.exports =
    SupabaseConnectorSemanticLogicalRecordRepository;
