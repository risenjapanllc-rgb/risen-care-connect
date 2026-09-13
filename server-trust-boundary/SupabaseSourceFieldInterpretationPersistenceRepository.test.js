"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseSourceFieldInterpretationPersistenceRepository =
    require("./SupabaseSourceFieldInterpretationPersistenceRepository");

function createRepository({
    fetchResponse = {
        ok: true,
        status: 200,
        json: async () => "updated"
    }
} = {}) {
    const calls = [];

    const originalFetch =
        globalThis.fetch;

    globalThis.fetch =
        async (url, options) => {
            calls.push({
                url,
                options
            });

            return fetchResponse;
        };

    const repository =
        new SupabaseSourceFieldInterpretationPersistenceRepository({
            supabaseUrl:
                "https://example.supabase.co/",
            apiKey:
                "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            }
        });

    return {
        repository,
        calls,
        restore() {
            globalThis.fetch =
                originalFetch;
        }
    };
}

test("confirm calls Supabase confirmation RPC with verified context", async () => {
    const {
        repository,
        calls,
        restore
    } =
        createRepository();

    try {
        const result =
            await repository.confirm({
                verifiedFacilityId:
                    "11111111-1111-1111-1111-111111111111",
                verifiedConnectorId:
                    "22222222-2222-2222-2222-222222222222",
                sourceDocumentKey:
                    "source-document-1",
                sourceFieldKey:
                    "sheet:0:column:3",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            });

        assert.deepEqual(
            result,
            {
                status: "updated"
            }
        );

        assert.equal(
            calls.length,
            1
        );

        assert.equal(
            calls[0].url,
            "https://example.supabase.co/rest/v1/rpc/confirm_connector_source_field_interpretation"
        );

        assert.equal(
            calls[0].options.method,
            "POST"
        );

        assert.equal(
            calls[0].options.headers.apikey,
            "test-api-key"
        );

        assert.equal(
            calls[0].options.headers.Authorization,
            "Bearer test-access-token"
        );

        assert.deepEqual(
            JSON.parse(
                calls[0].options.body
            ),
            {
                p_facility_id:
                    "11111111-1111-1111-1111-111111111111",
                p_connector_id:
                    "22222222-2222-2222-2222-222222222222",
                p_source_document_key:
                    "source-document-1",
                p_source_field_key:
                    "sheet:0:column:3",
                p_interpretation_status:
                    "deferred",
                p_mapping_status:
                    "unmapped",
                p_confirmed_meaning:
                    null
            }
        );
    } finally {
        restore();
    }
});

test("confirm supports no-standard-match confirmation", async () => {
    const {
        repository,
        restore
    } =
        createRepository({
            fetchResponse: {
                ok: true,
                status: 200,
                json:
                    async () =>
                        "unchanged"
            }
        });

    try {
        const result =
            await repository.confirm({
                verifiedFacilityId:
                    "11111111-1111-1111-1111-111111111111",
                verifiedConnectorId:
                    "22222222-2222-2222-2222-222222222222",
                sourceDocumentKey:
                    "source-document-1",
                sourceFieldKey:
                    "sheet:0:column:4",
                interpretationStatus:
                    "confirmed",
                mappingStatus:
                    "no_standard_match",
                confirmedMeaning:
                    null
            });

        assert.deepEqual(
            result,
            {
                status: "unchanged"
            }
        );
    } finally {
        restore();
    }
});

test("confirm rejects invalid input before calling Supabase", async () => {
    const {
        repository,
        calls,
        restore
    } =
        createRepository();

    try {
        const result =
            await repository.confirm({
                verifiedFacilityId:
                    "11111111-1111-1111-1111-111111111111",
                verifiedConnectorId:
                    "22222222-2222-2222-2222-222222222222",
                sourceDocumentKey:
                    "source-document-1",
                sourceFieldKey:
                    "",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            });

        assert.deepEqual(
            result,
            {
                status: "invalid"
            }
        );

        assert.equal(
            calls.length,
            0
        );
    } finally {
        restore();
    }
});

test("confirm rejects unexpected RPC status", async () => {
    const {
        repository,
        restore
    } =
        createRepository({
            fetchResponse: {
                ok: true,
                status: 200,
                json:
                    async () =>
                        "unexpected"
            }
        });

    try {
        await assert.rejects(
            repository.confirm({
                verifiedFacilityId:
                    "11111111-1111-1111-1111-111111111111",
                verifiedConnectorId:
                    "22222222-2222-2222-2222-222222222222",
                sourceDocumentKey:
                    "source-document-1",
                sourceFieldKey:
                    "sheet:0:column:5",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            }),
            /invalid status/
        );
    } finally {
        restore();
    }
});
