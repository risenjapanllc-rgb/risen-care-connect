"use strict";

class SupabaseSourceResidentMappingPersistenceRepository {
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
            typeof accessTokenProvider.getAccessToken !==
                "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseSourceResidentMappingPersistenceRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl =
            supabaseUrl.replace(/\/+$/, "");
        this.apiKey =
            apiKey;
        this.accessTokenProvider =
            accessTokenProvider;
        this.fetchImpl =
            fetchImpl;
    }

    async save({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        mappingStatus,
        residentId,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const validStatuses =
            new Set([
                "confirmed",
                "deferred",
                "no_match"
            ]);

        if (
            typeof verifiedFacilityId !== "string" ||
            !verifiedFacilityId.trim() ||
            typeof verifiedConnectorId !== "string" ||
            !verifiedConnectorId.trim() ||
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof identifierType !== "string" ||
            !["user_code", "name"].includes(
                identifierType.trim()
            ) ||
            typeof identifierDigest !== "string" ||
            !/^[0-9a-f]{64}$/.test(
                identifierDigest.trim()
            ) ||
            typeof mappingStatus !== "string" ||
            !validStatuses.has(mappingStatus.trim()) ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new TypeError(
                "source resident mapping is invalid"
            );
        }

        const normalizedStatus =
            mappingStatus.trim();

        const normalizedResidentId =
            typeof residentId === "string"
                ? residentId.trim()
                : residentId;

        if (
            (
                normalizedStatus ===
                    "confirmed" &&
                (
                    typeof normalizedResidentId !==
                        "string" ||
                    !normalizedResidentId
                )
            ) ||
            (
                normalizedStatus !==
                    "confirmed" &&
                normalizedResidentId != null
            )
        ) {
            throw new TypeError(
                "source resident mapping semantics are invalid"
            );
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/upsert_connector_source_resident_mapping`,
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
                            p_identifier_type:
                                identifierType.trim(),
                            p_identifier_digest:
                                identifierDigest.trim(),
                            p_mapping_status:
                                normalizedStatus,
                            p_resident_id:
                                normalizedStatus ===
                                    "confirmed"
                                    ? normalizedResidentId
                                    : null,
                            p_source_updated_at:
                                new Date(
                                    sourceUpdatedAt
                                ).toISOString(),
                            p_source_size:
                                sourceSize
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source resident mapping persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            ![
                "created",
                "updated",
                "unchanged"
            ].includes(result)
        ) {
            throw new Error(
                "Supabase source resident mapping persistence returned invalid result"
            );
        }

        return {
            status: result
        };
    }
}

module.exports =
    SupabaseSourceResidentMappingPersistenceRepository;
