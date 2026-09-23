"use strict";

const VALID_DECISIONS = new Set([
    "approved_new",
    "rejected",
    "deferred"
]);

class SupabaseResidentAdmissionDecisionRepository {
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
            typeof accessTokenProvider.getAccessToken !== "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseResidentAdmissionDecisionRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl = supabaseUrl.trim().replace(/\/+$/, "");
        this.apiKey = apiKey.trim();
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;
    }

    validateScope(input = {}) {
        if (
            typeof input.verifiedFacilityId !== "string" ||
            !input.verifiedFacilityId.trim() ||
            typeof input.verifiedConnectorId !== "string" ||
            !input.verifiedConnectorId.trim() ||
            typeof input.sourceDocumentKey !== "string" ||
            !input.sourceDocumentKey.trim() ||
            typeof input.sourceUpdatedAt !== "string" ||
            !input.sourceUpdatedAt.trim() ||
            Number.isNaN(Date.parse(input.sourceUpdatedAt)) ||
            !Number.isSafeInteger(input.sourceSize) ||
            input.sourceSize < 0
        ) {
            throw new TypeError("resident admission scope is invalid");
        }
    }

    async rpc(name, body) {
        const token =
            await this.accessTokenProvider.getAccessToken();

        if (typeof token !== "string" || !token.trim()) {
            throw new Error("Supabase access token is unavailable");
        }

        const response = await this.fetchImpl(
            `${this.supabaseUrl}/rest/v1/rpc/${name}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: this.apiKey,
                    Authorization: `Bearer ${token.trim()}`
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            throw new Error(
                `Supabase resident admission request failed: ${response.status}`
            );
        }

        return await response.json();
    }

    async save(input = {}) {
        this.validateScope(input);

        if (
            typeof input.sourceEntityKey !== "string" ||
            !input.sourceEntityKey.trim() ||
            !VALID_DECISIONS.has(input.decision) ||
            typeof input.reviewedAt !== "string" ||
            !input.reviewedAt.trim() ||
            Number.isNaN(Date.parse(input.reviewedAt))
        ) {
            throw new TypeError("resident admission decision is invalid");
        }

        const result = await this.rpc(
            "upsert_connector_resident_admission_decision",
            {
                p_facility_id: input.verifiedFacilityId.trim(),
                p_connector_id: input.verifiedConnectorId.trim(),
                p_source_document_key: input.sourceDocumentKey.trim(),
                p_source_entity_key: input.sourceEntityKey.trim(),
                p_decision: input.decision,
                p_reviewed_at:
                    new Date(input.reviewedAt).toISOString(),
                p_source_updated_at:
                    new Date(input.sourceUpdatedAt).toISOString(),
                p_source_size: input.sourceSize
            }
        );

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            !["created", "updated", "unchanged"].includes(
                result[0].status
            )
        ) {
            throw new Error(
                "Supabase resident admission persistence returned invalid result"
            );
        }

        return { status: result[0].status };
    }

    async list(input = {}) {
        this.validateScope(input);

        const result = await this.rpc(
            "list_connector_resident_admission_decisions",
            {
                p_facility_id: input.verifiedFacilityId.trim(),
                p_connector_id: input.verifiedConnectorId.trim(),
                p_source_document_key: input.sourceDocumentKey.trim(),
                p_source_updated_at:
                    new Date(input.sourceUpdatedAt).toISOString(),
                p_source_size: input.sourceSize
            }
        );

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase resident admission query returned invalid result"
            );
        }

        return result.map(row => {
            if (
                !row ||
                typeof row.source_entity_key !== "string" ||
                !row.source_entity_key.trim() ||
                !VALID_DECISIONS.has(row.decision) ||
                typeof row.reviewed_at !== "string" ||
                Number.isNaN(Date.parse(row.reviewed_at))
            ) {
                throw new Error(
                    "Supabase resident admission query returned invalid row"
                );
            }

            return {
                sourceEntityKey: row.source_entity_key.trim(),
                decision: row.decision,
                reviewedAt:
                    new Date(row.reviewed_at).toISOString()
            };
        });
    }
}

module.exports =
    SupabaseResidentAdmissionDecisionRepository;
