"use strict";

const Base =
    require(
        "../server-domain/storage/DocumentSemanticTargetQueryRepository"
    );

class SupabaseDocumentSemanticTargetQueryRepository
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
                "SupabaseDocumentSemanticTargetQueryRepository requires dependencies"
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
            validation?.status ===
                "invalid"
        ) {
            return validation;
        }

        const semanticType =
            input.semanticType.trim();

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/list_document_semantic_targets`,
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
                            p_semantic_type:
                                semanticType
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase Document Semantic Target query failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase Document Semantic Target query returned invalid result"
            );
        }

        const targets =
            rows
                .map(row =>
                    typeof row?.semantic_target ===
                        "string"
                        ? row.semantic_target.trim()
                        : ""
                )
                .filter(Boolean);

        return {
            status: "found",
            semanticType,
            targets:
                Array.from(
                    new Set(targets)
                )
        };
    }
}

module.exports =
    SupabaseDocumentSemanticTargetQueryRepository;
