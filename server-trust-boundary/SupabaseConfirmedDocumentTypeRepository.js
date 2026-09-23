"use strict";

class SupabaseConfirmedDocumentTypeRepository {
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
                "SupabaseConfirmedDocumentTypeRepository requires Supabase configuration"
            );
        }

        this.supabaseUrl = supabaseUrl.trim().replace(/\/+$/, "");
        this.apiKey = apiKey.trim();
        this.accessTokenProvider = accessTokenProvider;
        this.fetchImpl = fetchImpl;
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
                "confirmed document type scope is invalid"
            );
        }
    }

    async accessToken() {
        const token = await this.accessTokenProvider.getAccessToken();

        if (typeof token !== "string" || !token.trim()) {
            throw new Error("Supabase access token is unavailable");
        }

        return token.trim();
    }

    async rpc(name, body) {
        const token = await this.accessToken();
        const response = await this.fetchImpl(
            `${this.supabaseUrl}/rest/v1/rpc/${name}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: this.apiKey,
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            throw new Error(
                `Supabase confirmed document type request failed: ${response.status}`
            );
        }

        return await response.json();
    }

    async save(input = {}) {
        this.validateScope(input);

        const {
            verifiedFacilityId,
            verifiedConnectorId,
            sourceDocumentKey,
            documentType,
            confirmedAt,
            sourceUpdatedAt,
            sourceSize
        } = input;

        if (
            typeof documentType !== "string" ||
            !documentType.trim() ||
            typeof confirmedAt !== "string" ||
            !confirmedAt.trim() ||
            Number.isNaN(Date.parse(confirmedAt))
        ) {
            throw new TypeError("confirmed document type is invalid");
        }

        const result = await this.rpc(
            "upsert_connector_confirmed_document_type",
            {
                p_facility_id: verifiedFacilityId.trim(),
                p_connector_id: verifiedConnectorId.trim(),
                p_source_document_key: sourceDocumentKey.trim(),
                p_document_type: documentType.trim(),
                p_confirmed_at: new Date(confirmedAt).toISOString(),
                p_source_updated_at: new Date(sourceUpdatedAt).toISOString(),
                p_source_size: sourceSize
            }
        );

        if (
            !Array.isArray(result) ||
            result.length !== 1 ||
            !result[0] ||
            !["created", "updated", "unchanged"].includes(result[0].status)
        ) {
            throw new Error(
                "Supabase confirmed document type persistence returned invalid result"
            );
        }

        return { status: result[0].status };
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

        const result = await this.rpc(
            "get_connector_confirmed_document_type",
            {
                p_facility_id: verifiedFacilityId.trim(),
                p_connector_id: verifiedConnectorId.trim(),
                p_source_document_key: sourceDocumentKey.trim(),
                p_source_updated_at: new Date(sourceUpdatedAt).toISOString(),
                p_source_size: sourceSize
            }
        );

        if (!Array.isArray(result)) {
            throw new Error(
                "Supabase confirmed document type query returned invalid result"
            );
        }

        if (result.length === 0) {
            return { status: "not_found", confirmation: null };
        }

        if (result.length !== 1) {
            throw new Error(
                "Supabase confirmed document type query returned ambiguous result"
            );
        }

        const row = result[0];

        if (
            !row ||
            typeof row !== "object" ||
            Array.isArray(row) ||
            typeof row.document_type !== "string" ||
            !row.document_type.trim() ||
            typeof row.confirmed_at !== "string" ||
            !row.confirmed_at.trim() ||
            Number.isNaN(Date.parse(row.confirmed_at))
        ) {
            throw new Error(
                "Supabase confirmed document type query returned invalid row"
            );
        }

        return {
            status: "found",
            confirmation: {
                documentType: row.document_type.trim(),
                confirmedAt: row.confirmed_at.trim()
            }
        };
    }
}

module.exports = SupabaseConfirmedDocumentTypeRepository;
