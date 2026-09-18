"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorResidentCandidateRepository =
    require("./ConnectorResidentCandidateRepository");

test("uses verified facility and connector context with the connector-scoped RPC", async () => {
    let request = null;

    const repository =
        new ConnectorResidentCandidateRepository({
            supabaseUrl:
                "https://example.supabase.co/",
            apiKey:
                "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            },
            fetchImpl: async (url, options) => {
                request = {
                    url,
                    options
                };

                return {
                    ok: true,
                    async json() {
                        return [
                            {
                                resident_id:
                                    "resident-1",
                                user_code:
                                    "U001",
                                name:
                                    "Test Resident",
                                kana:
                                    "テスト",
                                birth_date:
                                    "2000-01-01"
                            }
                        ];
                    }
                };
            }
        });

    const result =
        await repository.getCandidates({
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId:
                "connector-1",
            userCode:
                " U001 "
        });

    assert.strictEqual(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/get_connector_resident_candidates_v2"
    );

    assert.deepStrictEqual(
        JSON.parse(request.options.body),
        {
            p_facility_id:
                "facility-1",
            p_connector_id:
                "connector-1",
            p_user_code:
                "U001",
            p_name:
                null
        }
    );

    assert.deepStrictEqual(
        result,
        [
            {
                residentId:
                    "resident-1",
                userCode:
                    "U001",
                name:
                    "Test Resident",
                kana:
                    "テスト",
                birthDate:
                    "2000-01-01"
            }
        ]
    );
});

test("does not query when verified scope or user code is missing", async () => {
    let fetchCount = 0;

    const repository =
        new ConnectorResidentCandidateRepository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            },
            fetchImpl: async () => {
                fetchCount += 1;
                throw new Error(
                    "fetch must not be called"
                );
            }
        });

    assert.deepStrictEqual(
        await repository.getCandidates({
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId:
                "",
            userCode:
                "U001"
        }),
        []
    );

    assert.strictEqual(
        fetchCount,
        0
    );
});
