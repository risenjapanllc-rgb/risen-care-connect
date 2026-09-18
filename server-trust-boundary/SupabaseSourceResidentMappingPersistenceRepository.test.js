"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Repository =
    require("./SupabaseSourceResidentMappingPersistenceRepository");

test("persists a human-confirmed resident link with verified connector scope and source snapshot", async () => {
    let request = null;

    const repository =
        new Repository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "public-test-key",
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
                        status: 200,
                        async json() {
                            return "created";
                        }
                    };
                }
        });

    const result =
        await repository.save({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "opaque-document-key",
            identifierType:
                "name",
            identifierDigest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            mappingStatus:
                "confirmed",
            residentId:
                "33333333-3333-3333-3333-333333333333",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.strictEqual(
        result.status,
        "created"
    );

    assert.strictEqual(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/upsert_connector_source_resident_mapping"
    );

    const body =
        JSON.parse(request.options.body);

    assert.deepStrictEqual(
        body,
        {
            p_facility_id:
                "11111111-1111-1111-1111-111111111111",
            p_connector_id:
                "22222222-2222-2222-2222-222222222222",
            p_source_document_key:
                "opaque-document-key",
            p_identifier_type:
                "name",
            p_identifier_digest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            p_mapping_status:
                "confirmed",
            p_resident_id:
                "33333333-3333-3333-3333-333333333333",
            p_source_updated_at:
                "2026-09-15T02:30:00.000Z",
            p_source_size:
                9520
        }
    );

    assert.strictEqual(
        request.options.headers.Authorization,
        "Bearer test-access-token"
    );
});

test("persists deferred without residentId", async () => {
    let body = null;

    const repository =
        new Repository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "public-test-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            },
            fetchImpl:
                async (_url, options) => {
                    body =
                        JSON.parse(options.body);

                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return "unchanged";
                        }
                    };
                }
        });

    const result =
        await repository.save({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "opaque-document-key",
            identifierType:
                "name",
            identifierDigest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            mappingStatus:
                "deferred",
            residentId:
                null,
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.strictEqual(
        result.status,
        "unchanged"
    );
    assert.strictEqual(
        body.p_resident_id,
        null
    );
});

test("rejects invalid link semantics before Supabase request", async () => {
    let called = false;

    const repository =
        new Repository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "public-test-key",
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

    await assert.rejects(
        () =>
            repository.save({
                verifiedFacilityId:
                    "11111111-1111-1111-1111-111111111111",
                verifiedConnectorId:
                    "22222222-2222-2222-2222-222222222222",
                sourceDocumentKey:
                    "opaque-document-key",
                identifierType:
                    "name",
                identifierDigest:
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                mappingStatus:
                    "matched",
                residentId:
                    "33333333-3333-3333-3333-333333333333",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            }),
        TypeError
    );

    assert.strictEqual(
        called,
        false
    );
});
