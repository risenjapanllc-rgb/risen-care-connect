"use strict";

const SourceTemplateExactPersistenceRepository =
    require("../server-domain/storage/SourceTemplateExactPersistenceRepository");

class SupabaseSourceTemplateExactPersistenceRepository
    extends SourceTemplateExactPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceTemplateExactPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceTemplateExactPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !==
                "function"
        ) {
            throw new Error(
                "SupabaseSourceTemplateExactPersistenceRepository requires accessTokenProvider"
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

    async getOrCreate(input = {}) {
        const validation =
            await super.getOrCreate(input)
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
                "Supabase exact source template persistence requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_or_create_source_template_exact`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "apikey":
                            this.apiKey,
                        "Authorization":
                            `Bearer ${accessToken}`
                    },
                    body:
                        JSON.stringify({
                            p_facility_id:
                                input.verifiedFacilityId,
                            p_connector_id:
                                input.verifiedConnectorId,
                            p_display_name:
                                input.displayName,
                            p_file_type:
                                input.fileType,
                            p_document_type:
                                input.documentType,
                            p_structure_fingerprint:
                                input.structureFingerprint,
                            p_canonicalization_version:
                                input.canonicalizationVersion,
                            p_canonical_structure:
                                input.canonicalStructure
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase exact source template persistence failed: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            !Array.isArray(result) ||
            result.length !== 1
        ) {
            throw new Error(
                "Supabase exact source template persistence returned invalid result"
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
                "Supabase exact source template persistence returned invalid status"
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
                "Supabase exact source template persistence returned invalid template id"
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
    SupabaseSourceTemplateExactPersistenceRepository;
