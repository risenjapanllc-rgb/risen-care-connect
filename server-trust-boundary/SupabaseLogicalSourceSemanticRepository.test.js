"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseLogicalSourceSemanticRepository =
    require(
        "./SupabaseLogicalSourceSemanticRepository"
    );

test(
    "maps logical-source semantic persistence to exact Supabase RPC contract",
    async () => {
        let request = null;

        const repository =
            new SupabaseLogicalSourceSemanticRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey:
                    "api-key",
                accessTokenProvider: {
                    async getAccessToken() {
                        return "access-token";
                    }
                },
                fetchImpl:
                    async (
                        url,
                        options
                    ) => {
                        request = {
                            url,
                            options
                        };

                        return {
                            ok:
                                true,
                            status:
                                200,
                            async json() {
                                return [
                                    {
                                        status:
                                            "created",
                                        record_id:
                                            "11111111-1111-4111-8111-111111111111"
                                    }
                                ];
                            }
                        };
                    }
            });

        const result =
            await repository.save({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                sourceId:
                    "source-1",
                sourceRecordKey:
                    "a".repeat(64),
                residentId:
                    "22222222-2222-4222-8222-222222222222",
                semanticType:
                    "resident_profile",
                logicalSlot:
                    "primary",
                sourceRevision:
                    "b".repeat(64),
                expectedContentHash:
                    null,
                contentHash:
                    "c".repeat(64),
                canonicalizationVersion:
                    "risen-resident-profile-canonicalization-1",
                semanticContent: {
                    "user.birth_date":
                        "1980-04-12"
                }
            });

        assert.deepEqual(
            result,
            {
                status:
                    "created",
                recordId:
                    "11111111-1111-4111-8111-111111111111"
            }
        );

        assert.match(
            request.url,
            /persist_connector_logical_source_semantic_record$/
        );

        const body =
            JSON.parse(
                request.options.body
            );

        assert.equal(
            body.p_source_id,
            "source-1"
        );

        assert.equal(
            body.p_expected_content_hash,
            null
        );

        assert.deepEqual(
            body.p_semantic_content,
            {
                "user.birth_date":
                    "1980-04-12"
            }
        );
    }
);
