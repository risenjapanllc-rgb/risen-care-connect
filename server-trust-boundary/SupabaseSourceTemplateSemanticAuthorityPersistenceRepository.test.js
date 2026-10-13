"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseSourceTemplateSemanticAuthorityPersistenceRepository =
    require(
        "./SupabaseSourceTemplateSemanticAuthorityPersistenceRepository"
    );

test(
    "authority list calls read RPC and maps rows",
    async () => {
        const originalFetch =
            global.fetch;

        let requestUrl = null;
        let requestOptions = null;

        global.fetch =
            async (url, options) => {
                requestUrl = url;
                requestOptions = options;

                return {
                    ok: true,

                    async json() {
                        return [
                            {
                                template_field_key:
                                    "column:0",

                                confirmed_meaning:
                                    "user.user_code",

                                standard_entity_name:
                                    "user",

                                standard_field_name:
                                    "user_code",

                                interpretation_status:
                                    "confirmed",

                                mapping_status:
                                    "mapped"
                            }
                        ];
                    }
                };
            };

        try {
            const repository =
                new SupabaseSourceTemplateSemanticAuthorityPersistenceRepository({
                    supabaseUrl:
                        "https://example.supabase.co/",

                    apiKey:
                        "api-key",

                    accessTokenProvider: {
                        async getAccessToken() {
                            return "access-token";
                        }
                    }
                });

            const result =
                await repository.list({
                    verifiedFacilityId:
                        "facility-1",

                    templateId:
                        "template-1"
                });

            assert.equal(
                requestUrl,
                "https://example.supabase.co/rest/v1/rpc/get_source_template_semantic_authority"
            );

            assert.equal(
                requestOptions.method,
                "POST"
            );

            assert.deepEqual(
                JSON.parse(
                    requestOptions.body
                ),
                {
                    p_facility_id:
                        "facility-1",

                    p_template_id:
                        "template-1"
                }
            );

            assert.deepEqual(
                result,
                {
                    status: "found",

                    mappings: [
                        {
                            templateFieldKey:
                                "column:0",

                            confirmedMeaning:
                                "user.user_code",

                            standardEntityName:
                                "user",

                            standardFieldName:
                                "user_code",

                            interpretationStatus:
                                "confirmed",

                            mappingStatus:
                                "mapped"
                        }
                    ]
                }
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);
