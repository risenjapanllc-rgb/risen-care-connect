"use strict";

class SupabaseSourceDocumentTemplateBindingQueryRepository {
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
            typeof accessTokenProvider
                .getAccessToken !== "function" ||
            typeof fetchImpl !== "function"
        ) {
            throw new Error(
                "SupabaseSourceDocumentTemplateBindingQueryRepository requires Supabase configuration"
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

    validateScope({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        if (
            typeof verifiedFacilityId !==
                "string" ||
            !verifiedFacilityId.trim() ||
            typeof verifiedConnectorId !==
                "string" ||
            !verifiedConnectorId.trim() ||
            typeof sourceDocumentKey !==
                "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !==
                "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new TypeError(
                "source document template binding query scope is invalid"
            );
        }
    }

    async accessToken() {
        const token =
            await this.accessTokenProvider
                .getAccessToken();

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
                `${this.supabaseUrl}/rest/v1/rpc/get_connector_source_document_template_binding`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            this.apiKey,

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify({
                            p_facility_id:
                                verifiedFacilityId
                                    .trim(),

                            p_connector_id:
                                verifiedConnectorId
                                    .trim(),

                            p_source_document_key:
                                sourceDocumentKey
                                    .trim(),

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
                `Supabase source document template binding query failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase source document template binding query returned invalid result"
            );
        }

        if (rows.length === 0) {
            return {
                status: "not_found",
                binding: null
            };
        }

        if (rows.length !== 1) {
            throw new Error(
                "Supabase source document template binding query returned ambiguous result"
            );
        }

        const row =
            rows[0];

        if (
            !row ||
            typeof row !== "object" ||
            Array.isArray(row) ||
            typeof row.template_id !==
                "string" ||
            !row.template_id.trim() ||
            typeof row.match_method !==
                "string" ||
            !row.match_method.trim() ||
            (
                row.match_confidence !== null &&
                (
                    typeof row.match_confidence !==
                        "string" ||
                    !row.match_confidence.trim()
                )
            ) ||
            typeof row.confirmed_by_human !==
                "boolean" ||
            (
                row.confirmed_at !== null &&
                (
                    typeof row.confirmed_at !==
                        "string" ||
                    !row.confirmed_at.trim() ||
                    Number.isNaN(
                        Date.parse(
                            row.confirmed_at
                        )
                    )
                )
            )
        ) {
            throw new Error(
                "Supabase source document template binding query returned invalid row"
            );
        }

        return {
            status: "found",

            binding: {
                templateId:
                    row.template_id.trim(),

                matchMethod:
                    row.match_method.trim(),

                matchConfidence:
                    typeof row.match_confidence ===
                        "string"
                        ? row
                            .match_confidence
                            .trim()
                        : null,

                confirmedByHuman:
                    row.confirmed_by_human,

                confirmedAt:
                    typeof row.confirmed_at ===
                        "string"
                        ? row.confirmed_at.trim()
                        : null
            }
        };
    }
}

module.exports =
    SupabaseSourceDocumentTemplateBindingQueryRepository;
