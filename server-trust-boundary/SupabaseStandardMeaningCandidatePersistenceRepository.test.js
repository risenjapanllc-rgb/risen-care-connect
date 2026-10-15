"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseStandardMeaningCandidatePersistenceRepository =
    require(
        "./SupabaseStandardMeaningCandidatePersistenceRepository"
    );

test(
    "submits Standard Meaning candidate through Supabase RPC",
    async () => {
        const originalFetch =
            global.fetch;

        let request = null;

        global.fetch =
            async (
                url,
                options
            ) => {
                request = {
                    url,
                    options
                };

                return {
                    ok: true,

                    async json() {
                        return [{
                            status:
                                "created",

                            candidate_id:
                                "candidate-1"
                        }];
                    }
                };
            };

        try {
            const repository =
                new SupabaseStandardMeaningCandidatePersistenceRepository({
                    supabaseUrl:
                        "https://example.supabase.co/",

                    apiKey:
                        "test-key",

                    accessTokenProvider: {
                        async getAccessToken() {
                            return "test-token";
                        }
                    }
                });

            const result =
                await repository.submit({
                    verifiedFacilityId:
                        "facility-1",

                    verifiedConnectorId:
                        "connector-1",

                    templateId:
                        "template-1",

                    templateFieldKey:
                        "field-1",

                    proposedMeaning:
                        "受給者証の所持状態",

                    evidence: {
                        sourceLabel:
                            "所持"
                    },

                    submittedAt:
                        "2026-10-15T11:30:00.000Z"
                });

            assert.equal(
                result.status,
                "created"
            );

            assert.equal(
                result.candidateId,
                "candidate-1"
            );

            assert.equal(
                request.url,
                "https://example.supabase.co/rest/v1/rpc/submit_standard_meaning_candidate"
            );

            const body =
                JSON.parse(
                    request.options.body
                );

            assert.deepEqual(
                body,
                {
                    p_facility_id:
                        "facility-1",

                    p_connector_id:
                        "connector-1",

                    p_template_id:
                        "template-1",

                    p_template_field_key:
                        "field-1",

                    p_proposed_meaning:
                        "受給者証の所持状態",

                    p_evidence: {
                        sourceLabel:
                            "所持"
                    },

                    p_submitted_at:
                        "2026-10-15T11:30:00.000Z"
                }
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);

test(
    "returns invalid before calling Supabase for invalid input",
    async () => {
        const originalFetch =
            global.fetch;

        let called = false;

        global.fetch =
            async () => {
                called = true;

                throw new Error(
                    "fetch should not be called"
                );
            };

        try {
            const repository =
                new SupabaseStandardMeaningCandidatePersistenceRepository({
                    supabaseUrl:
                        "https://example.supabase.co",

                    apiKey:
                        "test-key",

                    accessTokenProvider: {
                        async getAccessToken() {
                            return "test-token";
                        }
                    }
                });

            const result =
                await repository.submit({
                    verifiedFacilityId:
                        "facility-1",

                    verifiedConnectorId:
                        "connector-1",

                    templateId:
                        "template-1",

                    templateFieldKey:
                        "field-1",

                    proposedMeaning:
                        "",

                    evidence: {},

                    submittedAt:
                        "2026-10-15T11:30:00.000Z"
                });

            assert.equal(
                result.status,
                "invalid"
            );

            assert.equal(
                called,
                false
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);

test(
    "lists Standard Meaning candidates through Supabase RPC",
    async () => {
        const originalFetch =
            global.fetch;

        let request = null;

        global.fetch =
            async (
                url,
                options
            ) => {
                request = {
                    url,
                    options
                };

                return {
                    ok: true,

                    async json() {
                        return [{
                            candidate_id:
                                "candidate-1",

                            template_field_key:
                                "sheet:0:column:3",

                            proposed_meaning:
                                "受給者証の所持状態",

                            evidence: {
                                sourceLabel:
                                    "所持"
                            },

                            status:
                                "submitted",

                            submitted_at:
                                "2026-10-15T11:40:53.073Z"
                        }];
                    }
                };
            };

        try {
            const repository =
                new SupabaseStandardMeaningCandidatePersistenceRepository({
                    supabaseUrl:
                        "https://example.supabase.co",

                    apiKey:
                        "test-key",

                    accessTokenProvider: {
                        async getAccessToken() {
                            return "test-token";
                        }
                    }
                });

            const result =
                await repository.list({
                    verifiedFacilityId:
                        "facility-1",

                    verifiedConnectorId:
                        "connector-1",

                    templateId:
                        "template-1"
                });

            assert.equal(
                result.status,
                "found"
            );

            assert.equal(
                result.candidates.length,
                1
            );

            assert.equal(
                result.candidates[0]
                    .proposedMeaning,
                "受給者証の所持状態"
            );

            assert.equal(
                request.url,
                "https://example.supabase.co/rest/v1/rpc/get_standard_meaning_candidates"
            );

            assert.deepEqual(
                JSON.parse(
                    request.options.body
                ),
                {
                    p_facility_id:
                        "facility-1",

                    p_connector_id:
                        "connector-1",

                    p_template_id:
                        "template-1"
                }
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);
