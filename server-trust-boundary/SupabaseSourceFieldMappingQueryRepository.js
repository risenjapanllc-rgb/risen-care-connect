"use strict";

class SupabaseSourceFieldMappingQueryRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = fetch
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceFieldMappingQueryRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceFieldMappingQueryRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSourceFieldMappingQueryRepository requires accessTokenProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SupabaseSourceFieldMappingQueryRepository requires fetchImpl"
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

    async list({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        if (
            typeof verifiedFacilityId !== "string" ||
            !verifiedFacilityId.trim() ||
            typeof verifiedConnectorId !== "string" ||
            !verifiedConnectorId.trim() ||
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return {
                status: "invalid"
            };
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase source field mapping query requires access token"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/list_connector_source_field_mappings`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        apikey:
                            this.apiKey,
                        Authorization:
                            `Bearer ${accessToken}`
                    },
                    body:
                        JSON.stringify({
                            p_facility_id:
                                verifiedFacilityId.trim(),
                            p_connector_id:
                                verifiedConnectorId.trim(),
                            p_source_document_key:
                                sourceDocumentKey.trim(),
                            p_source_updated_at:
                                new Date(sourceUpdatedAt)
                                    .toISOString(),
                            p_source_size:
                                sourceSize
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source field mapping query failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase source field mapping query returned invalid result"
            );
        }

        const mappings =
            result.map(row => {
                if (
                    !row ||
                    typeof row !== "object" ||
                    Array.isArray(row) ||
                    typeof row.source_field_key !== "string" ||
                    !row.source_field_key.trim() ||
                    typeof row.standard_entity_name !== "string" ||
                    !row.standard_entity_name.trim() ||
                    typeof row.standard_field_name !== "string" ||
                    !row.standard_field_name.trim() ||
                    typeof row.confirmed_at !== "string" ||
                    !row.confirmed_at.trim()
                ) {
                    throw new Error(
                        "Supabase source field mapping query returned invalid row"
                    );
                }

                return {
                    sourceFieldKey:
                        row.source_field_key.trim(),
                    standardEntityName:
                        row.standard_entity_name.trim(),
                    standardFieldName:
                        row.standard_field_name.trim(),
                    sheetName:
                        typeof row.sheet_name === "string"
                            ? row.sheet_name
                            : null,
                    headerLabel:
                        typeof row.header_label === "string"
                            ? row.header_label
                            : null,
                    confirmedAt:
                        row.confirmed_at.trim()
                };
            });

        return {
            status: "found",
            mappings
        };
    }
}

module.exports =
    SupabaseSourceFieldMappingQueryRepository;
