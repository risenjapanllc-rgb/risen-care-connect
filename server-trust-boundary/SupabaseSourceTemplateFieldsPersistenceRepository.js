"use strict";

const SourceTemplateFieldsPersistenceRepository =
    require("../server-domain/storage/SourceTemplateFieldsPersistenceRepository");

class SupabaseSourceTemplateFieldsPersistenceRepository
    extends SourceTemplateFieldsPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceTemplateFieldsPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceTemplateFieldsPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseSourceTemplateFieldsPersistenceRepository requires accessTokenProvider"
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

    async register(input = {}) {
        const validation =
            await super.register(input)
                .catch(error => error);

        if (
            validation &&
            validation.status === "invalid"
        ) {
            return validation;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        if (
            typeof accessToken !== "string" ||
            !accessToken
        ) {
            throw new Error(
                "Supabase source template fields persistence requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/register_source_template_fields_exact`,
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
                            p_fields:
                                input.fields
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source template fields persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase source template fields persistence returned invalid result"
            );
        }

        const row =
            result[0];

        const allowedStatuses =
            new Set([
                "created",
                "unchanged",
                "conflict",
                "denied",
                "invalid"
            ]);

        if (
            !row ||
            typeof row !== "object" ||
            typeof row.status !== "string" ||
            !allowedStatuses.has(row.status)
        ) {
            throw new Error(
                "Supabase source template fields persistence returned invalid status"
            );
        }

        return {
            status:
                row.status,

            templateId:
                typeof row.template_id === "string" &&
                row.template_id.trim()
                    ? row.template_id.trim()
                    : null
        };
    }
}

module.exports =
    SupabaseSourceTemplateFieldsPersistenceRepository;
