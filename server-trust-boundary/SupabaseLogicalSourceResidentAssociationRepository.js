"use strict";

class SupabaseLogicalSourceResidentAssociationRepository {
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
                "SupabaseLogicalSourceResidentAssociationRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl =
            supabaseUrl
                .trim()
                .replace(/\/+$/, "");

        this.apiKey =
            apiKey.trim();

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
        matchMethod,
        sourceRevision
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
                `${this.supabaseUrl}/rest/v1/rpc/upsert_connector_logical_source_resident_association`,
                {
                    method: "POST",
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
                            p_match_method:
                                matchMethod,
                            p_source_revision:
                                sourceRevision
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase logical source resident association persistence failed: ${response.status}`
            );
        }

        const status =
            await response.json();

        if (
            ![
                "created",
                "updated",
                "unchanged",
                "conflict"
            ].includes(status)
        ) {
            throw new Error(
                "Supabase logical source resident association returned invalid result"
            );
        }

        return {
            status
        };
    }
}

module.exports =
    SupabaseLogicalSourceResidentAssociationRepository;
