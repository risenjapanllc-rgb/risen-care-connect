"use strict";

const SourceFieldMappingPersistenceRepository =
    require("../server-domain/storage/SourceFieldMappingPersistenceRepository");

class SupabaseSourceFieldMappingPersistenceRepository
    extends SourceFieldMappingPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceFieldMappingPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceFieldMappingPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSourceFieldMappingPersistenceRepository requires accessTokenProvider"
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
                "Supabase source field mapping persistence requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/upsert_connector_source_field_mapping`,
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
                            p_source_field_key:
                                input.sourceFieldKey,
                            p_standard_entity_name:
                                input.standardEntityName,
                            p_standard_field_name:
                                input.standardFieldName,
                            p_sheet_name:
                                input.sheetName,
                            p_header_label:
                                input.headerLabel,
                            p_confirmed_at:
                                input.confirmedAt
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source field mapping persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase source field mapping persistence returned invalid result"
            );
        }

        const row =
            result[0];

        const allowedStatuses =
            new Set([
                "created",
                "updated",
                "unchanged",
                "denied",
                "invalid"
            ]);

        if (
            !row ||
            typeof row !== "object" ||
            typeof row.status !== "string" ||
            !allowedStatuses.has(row.status)
        ) {
            throw new Error(
                "Supabase source field mapping persistence returned invalid status"
            );
        }

        return {
            status:
                row.status
        };
    }
}

module.exports =
    SupabaseSourceFieldMappingPersistenceRepository;
