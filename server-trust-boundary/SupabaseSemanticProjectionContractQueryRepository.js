"use strict";

const Base =
    require(
        "../server-domain/storage/SemanticProjectionContractQueryRepository"
    );

class SupabaseSemanticProjectionContractQueryRepository
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
                "SupabaseSemanticProjectionContractQueryRepository requires dependencies"
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

    async postRpc(
        rpcName,
        body,
        accessToken
    ) {
        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/${rpcName}`,
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
                        JSON.stringify(body)
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase Semantic Projection Contract query failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase Semantic Projection Contract query returned invalid result"
            );
        }

        return rows;
    }

    async list() {
        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        const contractRows =
            await this.postRpc(
                "list_semantic_projection_contracts",
                {},
                accessToken
            );

        const normalizedContracts = [];

        for (const row of contractRows) {
            const semanticType =
                typeof row?.semantic_type === "string"
                    ? row.semantic_type.trim()
                    : "";

            const sourceRecordIdentityRequired =
                row?.source_record_identity_required;

            if (
                !semanticType ||
                typeof sourceRecordIdentityRequired !==
                    "boolean"
            ) {
                throw new Error(
                    "Supabase Semantic Projection Contract query returned invalid contract"
                );
            }

            const requiredRows =
                await this.postRpc(
                    "list_semantic_projection_required_meanings",
                    {
                        p_semantic_type:
                            semanticType
                    },
                    accessToken
                );

            const requiredSemanticTargets = [];

            for (const requiredRow of requiredRows) {
                const target =
                    typeof requiredRow?.semantic_target ===
                        "string"
                        ? requiredRow.semantic_target.trim()
                        : "";

                if (!target) {
                    throw new Error(
                        "Supabase Semantic Projection Contract query returned invalid required meaning"
                    );
                }

                requiredSemanticTargets.push(
                    target
                );
            }

            normalizedContracts.push({
                semanticType,
                sourceRecordIdentityRequired,
                requiredSemanticTargets:
                    Array.from(
                        new Set(
                            requiredSemanticTargets
                        )
                    )
            });
        }

        const bySemanticType =
            new Map();

        for (
            const contract
            of normalizedContracts
        ) {
            if (
                bySemanticType.has(
                    contract.semanticType
                )
            ) {
                throw new Error(
                    "Supabase Semantic Projection Contract query returned duplicate semantic type"
                );
            }

            bySemanticType.set(
                contract.semanticType,
                contract
            );
        }

        return {
            status: "found",
            contracts:
                Array.from(
                    bySemanticType.values()
                )
        };
    }
}

module.exports =
    SupabaseSemanticProjectionContractQueryRepository;
