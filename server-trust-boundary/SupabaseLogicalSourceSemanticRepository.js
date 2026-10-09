"use strict";

class SupabaseLogicalSourceSemanticRepository {
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
                "SupabaseLogicalSourceSemanticRepository requires Supabase configuration"
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
        sourceId,
        sourceRecordKey,
        residentId,
        semanticType,
        logicalSlot,
        sourceRevision,
        expectedContentHash,
        contentHash,
        canonicalizationVersion,
        semanticContent
    } = {}) {
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
                `${this.supabaseUrl}/rest/v1/rpc/persist_connector_logical_source_semantic_record`,
                {
                    method:
                        "POST",
                    headers: {
                        "content-type":
                            "application/json",
                        apikey:
                            this.apiKey,
                        authorization:
                            `Bearer ${accessToken.trim()}`
                    },
                    body:
                        JSON.stringify({
                            p_facility_id:
                                verifiedFacilityId,
                            p_connector_id:
                                verifiedConnectorId,
                            p_source_id:
                                sourceId,
                            p_source_record_key:
                                sourceRecordKey,
                            p_resident_id:
                                residentId,
                            p_semantic_type:
                                semanticType,
                            p_logical_slot:
                                logicalSlot,
                            p_source_revision:
                                sourceRevision,
                            p_expected_content_hash:
                                expectedContentHash,
                            p_content_hash:
                                contentHash,
                            p_canonicalization_version:
                                canonicalizationVersion,
                            p_semantic_content:
                                semanticContent
                        })
                }
            );

        if (!response.ok) {
            const errorBody =
                await response.text();

            console.error(
                "logical_source_semantic_supabase_error",
                response.status,
                errorBody
            );

            throw new Error(
                `Supabase logical source semantic persistence failed: ${response.status}`
            );
        }

        const payload =
            await response.json();

        const row =
            Array.isArray(payload)
                ? payload[0]
                : payload;

        if (
            !row ||
            typeof row !== "object" ||
            Array.isArray(row) ||
            ![
                "created",
                "updated",
                "unchanged",
                "conflict",
                "denied"
            ].includes(row.status)
        ) {
            throw new Error(
                "Supabase logical source semantic persistence returned invalid result"
            );
        }

        const recordId =
            row.record_id ??
            row.recordId ??
            null;

        if (
            recordId !== null &&
            (
                typeof recordId !== "string" ||
                !recordId.trim()
            )
        ) {
            throw new Error(
                "Supabase logical source semantic persistence returned invalid record identity"
            );
        }

        return {
            status:
                row.status,
            recordId:
                recordId === null
                    ? null
                    : recordId.trim()
        };
    }
}

module.exports =
    SupabaseLogicalSourceSemanticRepository;
