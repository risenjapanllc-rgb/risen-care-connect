"use strict";

class SupabaseSourceResidentMappingQueryRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider,
        fetchImpl = fetch
    } = {}) {
        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceResidentMappingQueryRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceResidentMappingQueryRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSourceResidentMappingQueryRepository requires accessTokenProvider"
            );
        }

        if (typeof fetchImpl !== "function") {
            throw new Error(
                "SupabaseSourceResidentMappingQueryRepository requires fetchImpl"
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
                "Supabase source resident mapping query requires access token"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/list_connector_source_resident_mappings`,
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
                `Supabase source resident mapping query failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase source resident mapping query returned invalid result"
            );
        }

        const validStatuses =
            new Set([
                "confirmed",
                "deferred",
                "no_match"
            ]);

        const mappings =
            result.map(row => {
                if (
                    !row ||
                    typeof row !== "object" ||
                    Array.isArray(row)
                ) {
                    throw new Error(
                        "Supabase source resident mapping query returned invalid row"
                    );
                }

                const identifierType =
                    typeof row.identifier_type === "string"
                        ? row.identifier_type.trim()
                        : "";

                const identifierDigest =
                    typeof row.identifier_digest === "string"
                        ? row.identifier_digest.trim()
                        : "";

                const mappingStatus =
                    typeof row.mapping_status === "string"
                        ? row.mapping_status.trim()
                        : "";

                const residentId =
                    typeof row.resident_id === "string"
                        ? row.resident_id.trim()
                        : row.resident_id;

                const reviewedAt =
                    typeof row.reviewed_at === "string"
                        ? row.reviewed_at.trim()
                        : "";

                if (
                    !["user_code", "name"].includes(
                        identifierType
                    ) ||
                    !/^[0-9a-f]{64}$/.test(
                        identifierDigest
                    ) ||
                    !validStatuses.has(mappingStatus) ||
                    row.reviewed_by_human !== true ||
                    !reviewedAt ||
                    Number.isNaN(
                        Date.parse(reviewedAt)
                    ) ||
                    (
                        mappingStatus === "confirmed" &&
                        (
                            typeof residentId !== "string" ||
                            !residentId
                        )
                    ) ||
                    (
                        mappingStatus !== "confirmed" &&
                        residentId != null
                    )
                ) {
                    throw new Error(
                        "Supabase source resident mapping query returned invalid row"
                    );
                }

                return {
                    identifierType,
                    identifierDigest,
                    residentId:
                        mappingStatus === "confirmed"
                            ? residentId
                            : null,
                    mappingStatus,
                    reviewedByHuman:
                        true,
                    reviewedAt
                };
            });

        return {
            status: "found",
            mappings
        };
    }
}

module.exports =
    SupabaseSourceResidentMappingQueryRepository;
