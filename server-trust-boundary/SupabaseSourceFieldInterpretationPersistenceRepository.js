"use strict";

const SourceFieldInterpretationPersistenceRepository =
    require("../server-domain/storage/SourceFieldInterpretationPersistenceRepository");

class SupabaseSourceFieldInterpretationPersistenceRepository
    extends SourceFieldInterpretationPersistenceRepository {
    constructor({
        supabaseUrl,
        apiKey,
        accessTokenProvider
    } = {}) {
        super();

        if (!supabaseUrl) {
            throw new Error(
                "SupabaseSourceFieldInterpretationPersistenceRepository requires supabaseUrl"
            );
        }

        if (!apiKey) {
            throw new Error(
                "SupabaseSourceFieldInterpretationPersistenceRepository requires apiKey"
            );
        }

        if (
            !accessTokenProvider ||
            typeof accessTokenProvider.getAccessToken !== "function"
        ) {
            throw new Error(
                "SupabaseSourceFieldInterpretationPersistenceRepository requires accessTokenProvider"
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

    async confirm(input = {}) {
        const validation =
            await super.confirm(input)
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
                "Supabase source field interpretation persistence requires access token"
            );
        }

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/confirm_connector_source_field_interpretation_snapshot`,
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
                            p_source_document_key:
                                input.sourceDocumentKey,
                            p_source_field_key:
                                input.sourceFieldKey,
                            p_interpretation_status:
                                input.interpretationStatus,
                            p_mapping_status:
                                input.mappingStatus,
                            p_confirmed_meaning:
                                input.confirmedMeaning ?? null,
                            p_source_updated_at:
                                input.sourceUpdatedAt,
                            p_source_size:
                                input.sourceSize
                        })
                }
            );

        if (!response.ok) {
            const errorText =
                await response.text()
                    .catch(() => "");

            let errorDetail =
                errorText;

            try {
                const parsed =
                    JSON.parse(errorText);

                errorDetail =
                    [
                        parsed?.code,
                        parsed?.message,
                        parsed?.details,
                        parsed?.hint
                    ]
                        .filter(value =>
                            typeof value === "string" &&
                            value.trim()
                        )
                        .join(" | ");
            } catch (_) {
                // Keep the plain response body.
            }

            throw new Error(
                `Supabase source field interpretation persistence failed: ${response.status}${errorDetail ? ` | ${errorDetail}` : ""}`
            );
        }

        const result =
            await response.json();

        const status =
            typeof result === "string"
                ? result
                : Array.isArray(result) &&
                  result.length === 1 &&
                  typeof result[0] === "string"
                    ? result[0]
                    : Array.isArray(result) &&
                        result.length === 1 &&
                        result[0] &&
                        typeof result[0] === "object" &&
                        !Array.isArray(result[0]) &&
                        typeof result[0].status === "string"
                      ? result[0].status
                      : null;

        if (
            ![
                "created",
                "updated",
                "unchanged",
                "denied",
                "invalid"
            ].includes(status)
        ) {

            throw new Error(
                "Supabase source field interpretation persistence returned invalid status"
            );
        }

        return {
            status
        };
    }
}

module.exports =
    SupabaseSourceFieldInterpretationPersistenceRepository;
