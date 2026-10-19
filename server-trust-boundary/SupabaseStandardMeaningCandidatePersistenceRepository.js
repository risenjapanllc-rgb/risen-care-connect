"use strict";

const Base =
    require(
        "../server-domain/storage/StandardMeaningCandidatePersistenceRepository"
    );

class SupabaseStandardMeaningCandidatePersistenceRepository
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
                "SupabaseStandardMeaningCandidatePersistenceRepository requires dependencies"
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

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/get_standard_meaning_candidates`,
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

                            p_connector_id:
                                input
                                    .verifiedConnectorId,

                            p_template_id:
                                input
                                    .templateId
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase Standard Meaning candidate query failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (!Array.isArray(rows)) {
            throw new Error(
                "Supabase Standard Meaning candidate query returned invalid result"
            );
        }

        return {
            status: "found",

            candidates:
                rows.map(row => ({
                    candidateId:
                        typeof row?.candidate_id ===
                            "string"
                            ? row.candidate_id
                            : null,

                    templateFieldKey:
                        typeof row
                            ?.template_field_key ===
                            "string"
                            ? row.template_field_key
                            : "",

                    proposedMeaning:
                        typeof row
                            ?.proposed_meaning ===
                            "string"
                            ? row.proposed_meaning
                            : "",

                    evidence:
                        row?.evidence &&
                        typeof row.evidence ===
                            "object" &&
                        !Array.isArray(
                            row.evidence
                        )
                            ? row.evidence
                            : {},

                    status:
                        typeof row?.status ===
                            "string"
                            ? row.status
                            : "",

                    submittedAt:
                        typeof row?.submitted_at ===
                            "string"
                            ? row.submitted_at
                            : null
                }))
        };
    }

    async submit(input = {}) {
        const validation =
            await super.submit(input)
                .catch(error => error);

        if (
            validation?.status ===
                "invalid"
        ) {
            return validation;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/submit_standard_meaning_candidate`,
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

                            p_connector_id:
                                input
                                    .verifiedConnectorId,

                            p_template_id:
                                input
                                    .templateId,

                            p_template_field_key:
                                input
                                    .templateFieldKey,

                            p_proposed_meaning:
                                input
                                    .proposedMeaning,

                            p_evidence:
                                input
                                    .evidence,

                            p_submitted_at:
                                input
                                    .submittedAt
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `Supabase Standard Meaning candidate persistence failed: ${response.status}`
            );
        }

        const rows =
            await response.json();

        if (
            !Array.isArray(rows) ||
            rows.length !== 1
        ) {
            throw new Error(
                "Supabase Standard Meaning candidate returned invalid result"
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
                "Supabase Standard Meaning candidate returned invalid status"
            );
        }

        return {
            status:
                row.status,

            candidateId:
                typeof row.candidate_id ===
                    "string"
                    ? row.candidate_id
                    : null
        };
    }
    async clarify(input = {}) {
        const validation =
            await super.clarify(input)
                .catch(error => error);

        if (
            validation?.status ===
                "invalid"
        ) {
            return validation;
        }

        const accessToken =
            await this.accessTokenProvider
                .getAccessToken();

        const response =
            await fetch(
                `${this.supabaseUrl}/rest/v1/rpc/update_standard_meaning_candidate_clarification`,
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

                            p_connector_id:
                                input
                                    .verifiedConnectorId,

                            p_template_id:
                                input
                                    .templateId,

                            p_template_field_key:
                                input
                                    .templateFieldKey,

                            p_staff_clarification:
                                input
                                    .staffClarification,

                            p_clarified_at:
                                input
                                    .clarifiedAt
                        })
                }
            );

        if (!response.ok) {
            const errorText =
                await response.text();

            throw new Error(
                `Supabase Standard Meaning candidate clarification failed: ${response.status} ${errorText}`
            );
        }

        const rows =
            await response.json();

        if (
            !Array.isArray(rows) ||
            rows.length !== 1
        ) {
            throw new Error(
                "Supabase Standard Meaning candidate clarification returned invalid result"
            );
        }

        const row =
            rows[0];

        if (
            !row ||
            ![
                "updated",
                "unchanged",
                "denied",
                "invalid"
            ].includes(row.status)
        ) {
            throw new Error(
                "Supabase Standard Meaning candidate clarification returned invalid status"
            );
        }

        return {
            status:
                row.status,

            candidateId:
                typeof row.candidate_id ===
                    "string"
                    ? row.candidate_id
                    : null
        };
    }

}

module.exports =
    SupabaseStandardMeaningCandidatePersistenceRepository;
