"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseSourceFieldInterpretationQueryRepository =
    require("./SupabaseSourceFieldInterpretationQueryRepository");

test("lists source field interpretations through trusted Supabase RPC", async () => {
    let request = null;

    const repository =
        new SupabaseSourceFieldInterpretationQueryRepository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            },
            fetchImpl:
                async (url, options) => {
                    request = {
                        url,
                        options
                    };

                    return {
                        ok: true,
                        async json() {
                            return [
                                {
                                    source_field_key:
                                        "sheet:0:column:1",
                                    interpretation_status:
                                        "deferred",
                                    mapping_status:
                                        "unmapped",
                                    confirmed_meaning:
                                        null,
                                    confirmed_by_human:
                                        true
                                },
                                {
                                    source_field_key:
                                        "sheet:0:column:2",
                                    interpretation_status:
                                        "confirmed",
                                    mapping_status:
                                        "no_standard_match",
                                    confirmed_meaning:
                                        null,
                                    confirmed_by_human:
                                        true
                                }
                            ];
                        }
                    };
                }
        });

    const result =
        await repository.list({
            verifiedFacilityId:
                "facility-verified",
            verifiedConnectorId:
                "connector-verified",
            sourceDocumentKey:
                "source-document-1",
                sourceUpdatedAt:
                    "2026-09-22T00:00:00.000Z",
                sourceSize:
                    12345
        });

    assert.deepEqual(
        result,
        {
            status: "found",
            interpretations: [
                {
                    sourceFieldKey:
                        "sheet:0:column:1",
                    interpretationStatus:
                        "deferred",
                    mappingStatus:
                        "unmapped",
                    confirmedMeaning:
                        null,
                    confirmedByHuman:
                        true
                },
                {
                    sourceFieldKey:
                        "sheet:0:column:2",
                    interpretationStatus:
                        "confirmed",
                    mappingStatus:
                        "no_standard_match",
                    confirmedMeaning:
                        null,
                    confirmedByHuman:
                        true
                }
            ]
        }
    );

    assert.equal(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/list_connector_source_field_interpretations_snapshot"
    );

    assert.equal(
        request.options.method,
        "POST"
    );

    assert.deepEqual(
        JSON.parse(request.options.body),
        {
            p_facility_id:
                "facility-verified",
            p_connector_id:
                "connector-verified",
            p_source_document_key:
                "source-document-1",
            p_source_updated_at:
                "2026-09-22T00:00:00.000Z",
            p_source_size:
                12345
        }
    );
});

test("rejects invalid source field interpretation query identity before Supabase", async () => {
    let called = false;

    const repository =
        new SupabaseSourceFieldInterpretationQueryRepository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            },
            fetchImpl:
                async () => {
                    called = true;
                    throw new Error(
                        "must not be called"
                    );
                }
        });

    const result =
        await repository.list({
            verifiedFacilityId:
                "facility-verified",
            verifiedConnectorId:
                "connector-verified",
            sourceDocumentKey:
                ""
        });

    assert.deepEqual(
        result,
        {
            status: "invalid"
        }
    );

    assert.equal(
        called,
        false
    );
});

test("rejects malformed Supabase interpretation rows", async () => {
    const repository =
        new SupabaseSourceFieldInterpretationQueryRepository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            },
            fetchImpl:
                async () => ({
                    ok: true,
                    async json() {
                        return [
                            {
                                source_field_key:
                                    "sheet:0:column:1"
                            }
                        ];
                    }
                })
        });

    await assert.rejects(
        () =>
            repository.list({
                verifiedFacilityId:
                    "facility-verified",
                verifiedConnectorId:
                    "connector-verified",
                sourceDocumentKey:
                    "source-document-1",
                sourceUpdatedAt:
                    "2026-09-22T00:00:00.000Z",
                sourceSize:
                    12345
            }),
        /invalid row/
    );
});
