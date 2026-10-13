"use strict";

const Base =
    require("../server-domain/storage/SourceDocumentTemplateBindingPersistenceRepository");

class SupabaseSourceDocumentTemplateBindingPersistenceRepository
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
                "SupabaseSourceDocumentTemplateBindingPersistenceRepository requires dependencies"
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

    async bind(input = {}) {
        const validation =
            await super.bind(input)
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
                `${this.supabaseUrl}/rest/v1/rpc/bind_source_document_template`,
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
                            p_template_id:
                                input.templateId,
                            p_match_method:
                                input.matchMethod,
                            p_match_confidence:
                                input.matchConfidence,
                            p_confirmed_by_human:
                                input.confirmedByHuman,
                            p_confirmed_at:
                                input.confirmedAt
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase source document template binding failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (
            !Array.isArray(rows) ||
            rows.length !== 1
        ) {
            throw new Error(
                "Supabase source document template binding returned invalid result"
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
                "Supabase source document template binding returned invalid status"
            );
        }

        return {
            status:
                row.status,
            bindingId:
                typeof row.binding_id ===
                    "string"
                    ? row.binding_id
                    : null
        };
    }
}

module.exports =
    SupabaseSourceDocumentTemplateBindingPersistenceRepository;
