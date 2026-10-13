"use strict";

const Base =
    require("../server-domain/storage/SourceTemplateSemanticAuthorityPersistenceRepository");

class SupabaseSourceTemplateSemanticAuthorityPersistenceRepository
    extends Base {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (
            !supabaseUrl ||
            !apiKey ||
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseSourceTemplateSemanticAuthorityPersistenceRepository requires dependencies"
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
    }

    async list(input = {}) {
        const validation =
            await super.list(input)
                .catch(error => error);

        if (
            validation?.status === "invalid"
        ) {
            return validation;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_source_template_semantic_authority`,
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
                                input
                                    .verifiedFacilityId,

                            p_template_id:
                                input
                                    .templateId
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase template semantic authority query failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase template semantic authority query returned invalid result"
            );
        }

        return {
            status: "found",

            mappings:
                rows.map(row => ({
                    templateFieldKey:
                        row
                            .template_field_key,

                    confirmedMeaning:
                        row
                            .confirmed_meaning,

                    standardEntityName:
                        row
                            .standard_entity_name,

                    standardFieldName:
                        row
                            .standard_field_name,

                    interpretationStatus:
                        row
                            .interpretation_status,

                    mappingStatus:
                        row
                            .mapping_status
                }))
        };
    }

    async confirm(input = {}) {
        const validation =
            await super.confirm(input)
                .catch(error => error);

        if (
            validation?.status === "invalid"
        ) {
            return validation;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/confirm_source_template_semantic_authority`,
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
                                input.verifiedFacilityId,
                            p_connector_id:
                                input.verifiedConnectorId,
                            p_template_id:
                                input.templateId,
                            p_template_field_key:
                                input.templateFieldKey,
                            p_interpretation_status:
                                input.interpretationStatus,
                            p_mapping_status:
                                input.mappingStatus,
                            p_confirmed_meaning:
                                input.confirmedMeaning,
                            p_standard_entity_name:
                                input.standardEntityName,
                            p_standard_field_name:
                                input.standardFieldName,
                            p_confirmed_at:
                                input.confirmedAt
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase template semantic authority persistence failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (
            !Array.isArray(rows) ||
            rows.length !== 1
        ) {
            throw new Error(
                "Supabase template semantic authority returned invalid result"
            );
        }

        const row =
            rows[0];

        if (
            !row ||
            ![
                "created",
                "unchanged",
                "conflict",
                "denied",
                "invalid"
            ].includes(row.status)
        ) {
            throw new Error(
                "Supabase template semantic authority returned invalid status"
            );
        }

        return {
            status:
                row.status,
            authorityId:
                typeof row.authority_id ===
                    "string"
                    ? row.authority_id
                    : null
        };
    }
}

module.exports =
    SupabaseSourceTemplateSemanticAuthorityPersistenceRepository;
