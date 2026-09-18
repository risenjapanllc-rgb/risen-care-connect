"use strict";

class SupabaseSourceRecordIdentityMappingRepository {
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
            typeof accessTokenProvider.getAccessToken !== "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseSourceRecordIdentityMappingRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl =
            supabaseUrl.trim().replace(/\/+$/, "");
        this.apiKey =
            apiKey.trim();
        this.accessTokenProvider =
            accessTokenProvider;
        this.fetchImpl =
            fetchImpl;
    }

    validateScope({
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
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new TypeError(
                "source record identity mapping scope is invalid"
            );
        }
    }

    async accessToken() {
        const token =
            await this.accessTokenProvider.getAccessToken();

        if (
            typeof token !== "string" ||
            !token.trim()
        ) {
            throw new Error(
                "Supabase access token is unavailable"
            );
        }

        return token.trim();
    }

    async save(input = {}) {
        this.validateScope(input);

        const {
            verifiedFacilityId,
            verifiedConnectorId,
            sourceDocumentKey,
            sourceFieldKey,
            sheetName = null,
            headerLabel = null,
            confirmedAt,
            sourceUpdatedAt,
            sourceSize
        } = input;

        if (
            typeof sourceFieldKey !== "string" ||
            !sourceFieldKey.trim() ||
            typeof confirmedAt !== "string" ||
            !confirmedAt.trim() ||
            Number.isNaN(Date.parse(confirmedAt))
        ) {
            throw new TypeError(
                "source record identity mapping is invalid"
            );
        }

        const token =
            await this.accessToken();

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/upsert_connector_source_record_identity_mapping`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: this.apiKey,
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            verifiedFacilityId.trim(),
                        p_connector_id:
                            verifiedConnectorId.trim(),
                        p_source_document_key:
                            sourceDocumentKey.trim(),
                        p_source_field_key:
                            sourceFieldKey.trim(),
                        p_sheet_name:
                            typeof sheetName === "string"
                                ? sheetName
                                : null,
                        p_header_label:
                            typeof headerLabel === "string"
                                ? headerLabel
                                : null,
                        p_confirmed_at:
                            new Date(confirmedAt).toISOString(),
                        p_source_updated_at:
                            new Date(sourceUpdatedAt).toISOString(),
                        p_source_size:
                            sourceSize
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source record identity mapping persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            !["created", "updated", "unchanged"].includes(
                result[0].status
            )
        ) {
            throw new Error(
                "Supabase source record identity mapping persistence returned invalid result"
            );
        }

        return {
            status: result[0].status
        };
    }

    async get(input = {}) {
        this.validateScope(input);

        const {
            verifiedFacilityId,
            verifiedConnectorId,
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize
        } = input;

        const token =
            await this.accessToken();

        const response =
            await this.fetchImpl(
                `${this.supabaseUrl}/rest/v1/rpc/get_connector_source_record_identity_mapping`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: this.apiKey,
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        p_facility_id:
                            verifiedFacilityId.trim(),
                        p_connector_id:
                            verifiedConnectorId.trim(),
                        p_source_document_key:
                            sourceDocumentKey.trim(),
                        p_source_updated_at:
                            new Date(sourceUpdatedAt).toISOString(),
                        p_source_size:
                            sourceSize
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source record identity mapping query failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase source record identity mapping query returned invalid result"
            );
        }

        if (result.length === 0) {
            return {
                status: "not_found",
                mapping: null
            };
        }

        if (result.length !== 1) {
            throw new Error(
                "Supabase source record identity mapping query returned ambiguous result"
            );
        }

        const row = result[0];

        if (
            !row ||
            typeof row !== "object" ||
            Array.isArray(row) ||
            typeof row.source_field_key !== "string" ||
            !row.source_field_key.trim() ||
            typeof row.confirmed_at !== "string" ||
            !row.confirmed_at.trim() ||
            Number.isNaN(Date.parse(row.confirmed_at))
        ) {
            throw new Error(
                "Supabase source record identity mapping query returned invalid row"
            );
        }

        return {
            status: "found",
            mapping: {
                sourceFieldKey:
                    row.source_field_key.trim(),
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
            }
        };
    }
}

module.exports =
    SupabaseSourceRecordIdentityMappingRepository;
