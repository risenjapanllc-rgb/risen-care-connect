"use strict";

class SupabaseConnectorSemanticLogicalRecordPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = global.fetch
    } = {}) {
        if (typeof supabaseUrl !== "string" || !supabaseUrl.trim()) {
            throw new Error("Supabase logical semantic persistence requires supabaseUrl");
        }
        if (typeof apiKey !== "string" || !apiKey.trim()) {
            throw new Error("Supabase logical semantic persistence requires apiKey");
        }
        if (!accessTokenProvider || typeof accessTokenProvider.getAccessToken !== "function") {
            throw new Error("Supabase logical semantic persistence requires accessTokenProvider");
        }
        if (typeof fetchImpl !== "function") {
            throw new Error("Supabase logical semantic persistence requires fetch");
        }

        this.supabaseUrl = supabaseUrl.trim().replace(/\/$/, "");
        this.apiKey = apiKey.trim();
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;
    }

    async persist(input = {}) {
        if (!this.isValid(input)) {
            return { status: "invalid", recordId: null };
        }

        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (typeof accessToken !== "string" || !accessToken.trim()) {
            throw new Error("Supabase logical semantic persistence requires access token");
        }

        const response = await this.fetchImpl(
            this.supabaseUrl +
                "/rest/v1/rpc/persist_connector_semantic_logical_record",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": this.apiKey,
                    "Authorization": "Bearer " + accessToken.trim()
                },
                body: JSON.stringify({
                    p_facility_id: input.verifiedFacilityId.trim(),
                    p_connector_id: input.verifiedConnectorId.trim(),
                    p_resident_id: input.residentId.trim(),
                    p_semantic_type: input.semanticType.trim(),
                    p_logical_slot: input.logicalSlot.trim(),
                    p_source_document_key: input.sourceDocumentKey.trim(),
                    p_source_updated_at:
                        new Date(input.sourceUpdatedAt).toISOString(),
                    p_source_size: input.sourceSize,
                    p_expected_content_hash:
                        input.expectedContentHash === null
                            ? null
                            : input.expectedContentHash,
                    p_content_hash: input.contentHash,
                    p_canonicalization_version:
                        input.canonicalizationVersion.trim(),
                    p_semantic_content: input.semanticContent
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Supabase logical semantic persistence failed:" +
                response.status
            );
        }

        const result = await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            typeof result[0] !== "object"
        ) {
            throw new Error(
                "Supabase logical semantic persistence returned invalid result"
            );
        }

        const row = result[0];
        const validStatuses = new Set([
            "created",
            "updated",
            "unchanged",
            "stale",
            "conflict",
            "invalid",
            "denied"
        ]);

        if (!validStatuses.has(row.status)) {
            throw new Error(
                "Supabase logical semantic persistence returned invalid status"
            );
        }

        const recordId =
            typeof row.record_id === "string" && row.record_id.trim()
                ? row.record_id.trim()
                : null;

        if (
            ["created", "updated", "unchanged"].includes(row.status) &&
            !recordId
        ) {
            throw new Error(
                "Supabase logical semantic persistence returned invalid record"
            );
        }

        return {
            status: row.status,
            recordId
        };
    }

    isValid(input) {
        const requiredStrings = [
            input.verifiedFacilityId,
            input.verifiedConnectorId,
            input.residentId,
            input.semanticType,
            input.logicalSlot,
            input.sourceDocumentKey,
            input.sourceUpdatedAt,
            input.contentHash,
            input.canonicalizationVersion
        ];

        if (requiredStrings.some(value =>
            typeof value !== "string" || !value.trim()
        )) {
            return false;
        }

        if (Number.isNaN(Date.parse(input.sourceUpdatedAt))) {
            return false;
        }

        if (!Number.isSafeInteger(input.sourceSize) || input.sourceSize < 0) {
            return false;
        }

        if (!/^[0-9a-f]{64}$/.test(input.contentHash)) {
            return false;
        }

        if (
            input.expectedContentHash !== null &&
            (
                typeof input.expectedContentHash !== "string" ||
                !/^[0-9a-f]{64}$/.test(input.expectedContentHash)
            )
        ) {
            return false;
        }

        if (
            !input.semanticContent ||
            typeof input.semanticContent !== "object" ||
            Array.isArray(input.semanticContent)
        ) {
            return false;
        }

        return true;
    }
}

module.exports =
    SupabaseConnectorSemanticLogicalRecordPersistenceRepository;
