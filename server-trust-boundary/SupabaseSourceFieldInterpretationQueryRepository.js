"use strict";

class SupabaseSourceFieldInterpretationQueryRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = fetch
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceFieldInterpretationQueryRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceFieldInterpretationQueryRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSourceFieldInterpretationQueryRepository requires accessTokenProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SupabaseSourceFieldInterpretationQueryRepository requires fetchImpl"
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
                "Supabase source field interpretation query requires access token"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/list_connector_source_field_interpretations_snapshot`,
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
                                verifiedFacilityId,
                            p_connector_id:
                                verifiedConnectorId,
                            p_source_document_key:
                                sourceDocumentKey.trim(),
                            p_source_updated_at:
                                sourceUpdatedAt.trim(),
                            p_source_size:
                                sourceSize
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source field interpretation query failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase source field interpretation query returned invalid result"
            );
        }

        const interpretations =
            result.map(row => {
                if (
                    !row ||
                    typeof row !== "object" ||
                    Array.isArray(row) ||
                    typeof row.source_field_key !== "string" ||
                    !row.source_field_key.trim() ||
                    typeof row.interpretation_status !== "string" ||
                    typeof row.mapping_status !== "string" ||
                    typeof row.confirmed_by_human !== "boolean"
                ) {
                    throw new Error(
                        "Supabase source field interpretation query returned invalid row"
                    );
                }

                return {
                    sourceFieldKey:
                        row.source_field_key.trim(),
                    interpretationStatus:
                        row.interpretation_status,
                    mappingStatus:
                        row.mapping_status,
                    confirmedMeaning:
                        typeof row.confirmed_meaning === "string"
                            ? row.confirmed_meaning
                            : null,
                    confirmedByHuman:
                        row.confirmed_by_human
                };
            });

        return {
            status: "found",
            interpretations
        };
    }
}

module.exports =
    SupabaseSourceFieldInterpretationQueryRepository;
