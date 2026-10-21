"use strict";

const WordSourceTemplateReviewedPersistenceRepository =
    require("../server-domain/storage/WordSourceTemplateReviewedPersistenceRepository");

class SupabaseWordSourceTemplateReviewedPersistenceRepository
    extends WordSourceTemplateReviewedPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseWordSourceTemplateReviewedPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseWordSourceTemplateReviewedPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseWordSourceTemplateReviewedPersistenceRepository requires accessTokenProvider"
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
                "Supabase reviewed Word source template persistence requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/register_word_source_template_human_reviewed`,
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

                            p_source_document_key:
                                input.sourceDocumentKey,

                            p_source_updated_at:
                                input.sourceUpdatedAt,

                            p_source_size:
                                input.sourceSize,

                            p_display_name:
                                input.displayName,

                            p_document_type:
                                input.documentType,

                            p_fields:
                                input.fields,

                            p_confirmed_by_human:
                                input.confirmedByHuman,

                            p_confirmed_at:
                                input.confirmedAt
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase reviewed Word source template persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase reviewed Word source template persistence returned invalid result"
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
                "Supabase reviewed Word source template persistence returned invalid status"
            );
        }

        if (
            ["created", "unchanged", "conflict"]
                .includes(row.status) &&
            (
                typeof row.template_id !== "string" ||
                !row.template_id.trim()
            )
        ) {
            throw new Error(
                "Supabase reviewed Word source template persistence returned invalid template id"
            );
        }

        return {
            status:
                row.status,

            templateId:
                typeof row.template_id === "string" &&
                row.template_id.trim()
                    ? row.template_id.trim()
                    : null,

            bindingId:
                typeof row.binding_id === "string" &&
                row.binding_id.trim()
                    ? row.binding_id.trim()
                    : null
        };
    }
}

module.exports =
    SupabaseWordSourceTemplateReviewedPersistenceRepository;
