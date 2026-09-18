"use strict";

class SupabaseSourceResidentLinkPersistenceRepository {
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
                "SupabaseSourceResidentLinkPersistenceRepository requires Supabase configuration"
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
        sourceEntityKey,
        linkStatus,
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
            typeof sourceEntityKey !== "string" ||
            !sourceEntityKey.trim() ||
            typeof linkStatus !== "string" ||
            !validStatuses.has(linkStatus.trim()) ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new TypeError(
                "source resident link is invalid"
            );
        }

        const normalizedStatus =
            linkStatus.trim();

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
                "source resident link semantics are invalid"
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
                `${this.supabaseUrl}/rest/v1/rpc/upsert_connector_source_resident_link`,
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
                            p_source_entity_key:
                                sourceEntityKey.trim(),
                            p_link_status:
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
                `Supabase source resident link persistence failed: ${response.status}`
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
                "Supabase source resident link persistence returned invalid result"
            );
        }

        return {
            status: result
        };
    }
}

module.exports =
    SupabaseSourceResidentLinkPersistenceRepository;
