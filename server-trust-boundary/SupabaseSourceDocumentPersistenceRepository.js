"use strict";

const SourceDocumentPersistenceRepository =
    require("../server-domain/storage/SourceDocumentPersistenceRepository");

class SupabaseSourceDocumentPersistenceRepository
    extends SourceDocumentPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceDocumentPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceDocumentPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSourceDocumentPersistenceRepository requires accessTokenProvider"
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

    async upsert(input = {}) {
        const validation =
            await super.upsert(input)
                .catch((error) => error);

        if (
            validation &&
            validation.status === "invalid"
        ) {
            return validation;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase source document persistence requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/upsert_connector_source_document`,
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
                    body:
                        JSON.stringify({
                            p_facility_id:
                                input.verifiedFacilityId,
                            p_connector_id:
                                input.verifiedConnectorId,
                            p_source_document_key:
                                input.sourceDocumentKey,
                            p_source_type:
                                input.sourceType,
                            p_file_name:
                                input.fileName,
                            p_source_content:
                                input.sourceContent,
                            p_source_updated_at:
                                input.sourceUpdatedAt,
                            p_source_size:
                                input.sourceSize,
                            p_observed_at:
                                input.observedAt
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source document persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase source document persistence returned invalid result"
            );
        }

        const row =
            result[0];

        const allowedStatuses =
            new Set([
                "created",
                "updated",
                "unchanged",
                "denied"
            ]);

        if (
            !row ||
            typeof row !== "object" ||
            typeof row.status !== "string" ||
            !allowedStatuses.has(row.status)
        ) {
            throw new Error(
                "Supabase source document persistence returned invalid status"
            );
        }

        return {
            status:
                row.status
        };
    }
}

module.exports =
    SupabaseSourceDocumentPersistenceRepository;
