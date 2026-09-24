"use strict";

class SupabaseRecipientCertificateAtomicPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = global.fetch
    } = {}) {
        if (typeof supabaseUrl !== "string" || !supabaseUrl.trim()) {
            throw new Error(
                "Supabase recipient certificate atomic persistence requires supabaseUrl"
            );
        }

        if (typeof apiKey !== "string" || !apiKey.trim()) {
            throw new Error(
                "Supabase recipient certificate atomic persistence requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "Supabase recipient certificate atomic persistence requires accessTokenProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "Supabase recipient certificate atomic persistence requires fetch"
            );
        }

        this.supabaseUrl =
            supabaseUrl.trim().replace(/\/$/, "");
        this.apiKey = apiKey.trim();
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;
    }

    async persist(input = {}) {
        const accessToken =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken.trim()
        ) {
            throw new Error(
                "Supabase recipient certificate atomic persistence requires access token"
            );
        }

        const semantic = input.semantic;

        if (!semantic || typeof semantic !== "object") {
            throw new TypeError("semantic is required");
        }

        const response = await this.fetchImpl(
            this.supabaseUrl +
                "/rest/v1/rpc/persist_recipient_certificate_import_entry",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": this.apiKey,
                    "Authorization":
                        "Bearer " + accessToken.trim()
                },
                body: JSON.stringify({
                    p_facility_id:
                        input.verifiedFacilityId,
                    p_connector_id:
                        input.verifiedConnectorId,
                    p_resolution:
                        input.resolution,
                    p_identifier_type:
                        input.identifierType,
                    p_identifier_digest:
                        input.identifierDigest,
                    p_resident_id:
                        input.residentId ?? null,
                    p_display_name:
                        input.displayName ?? null,
                    p_resident_profile:
                        input.residentProfile ?? {},
                    p_semantic_type:
                        semantic.semanticType,
                    p_logical_slot:
                        semantic.logicalSlot,
                    p_semantic_content:
                        semantic.semanticContent,
                    p_content_hash:
                        semantic.contentHash,
                    p_canonicalization_version:
                        semantic.canonicalizationVersion,
                    p_expected_content_hash:
                        semantic.expectedContentHash ?? null,
                    p_source_document_key:
                        input.sourceDocumentKey,
                    p_source_updated_at:
                        new Date(
                            input.sourceUpdatedAt
                        ).toISOString(),
                    p_source_size:
                        input.sourceSize
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                "Supabase recipient certificate atomic persistence failed:" +
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
                "Supabase recipient certificate atomic persistence returned invalid result"
            );
        }

        const row = result[0];

        const validStatuses = new Set([
            "created",
            "updated",
            "unchanged",
            "stale",
            "not_approved",
            "conflict",
            "name_conflict",
            "user_code_conflict",
            "invalid",
            "denied"
        ]);

        if (!validStatuses.has(row.status)) {
            throw new Error(
                "Supabase recipient certificate atomic persistence returned invalid status"
            );
        }

        return {
            status: row.status,
            residentId:
                row.resident_id ?? null,
            recordId:
                row.record_id ?? null,
            residentCreated:
                row.resident_created === true
        };
    }
}

module.exports =
    SupabaseRecipientCertificateAtomicPersistenceRepository;
