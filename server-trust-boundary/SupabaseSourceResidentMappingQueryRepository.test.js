"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Repository =
    require("./SupabaseSourceResidentMappingQueryRepository");

function createRepository({
    result = []
} = {}) {
    let request = null;

    const repository =
        new Repository({
            supabaseUrl:
                "https://example.supabase.co",
            apiKey:
                "test-api-key",
            accessTokenProvider: {
                async getAccessToken() {
                    return "test-access-token";
                }
            },
            async fetchImpl(url, options) {
                request = {
                    url,
                    options
                };

                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return result;
                    }
                };
            }
        });

    return {
        repository,
        getRequest() {
            return request;
        }
    };
}

test("lists resident links using verified connector scope and exact source snapshot", async () => {
    const {
        repository,
        getRequest
    } = createRepository({
        result: [
            {
                identifier_type:
                    "name",
                identifier_digest:
                    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                resident_id:
                    "33333333-3333-3333-3333-333333333333",
                mapping_status:
                    "confirmed",
                reviewed_by_human:
                    true,
                reviewed_at:
                    "2026-09-15T03:00:00.000Z"
            }
        ]
    });

    const result =
        await repository.list({
            verifiedFacilityId:
                "11111111-1111-1111-1111-111111111111",
            verifiedConnectorId:
                "22222222-2222-2222-2222-222222222222",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.deepStrictEqual(
        result,
        {
            status: "found",
            mappings: [
                {
                    identifierType:
                        "name",
                    identifierDigest:
                        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    residentId:
                        "33333333-3333-3333-3333-333333333333",
                    mappingStatus:
                        "confirmed",
                    reviewedByHuman:
                        true,
                    reviewedAt:
                        "2026-09-15T03:00:00.000Z"
                }
            ]
        }
    );

    const request =
        getRequest();

    assert.strictEqual(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/list_connector_source_resident_mappings"
    );

    assert.strictEqual(
        request.options.method,
        "POST"
    );

    assert.strictEqual(
        request.options.headers.Authorization,
        "Bearer test-access-token"
    );

    assert.deepStrictEqual(
        JSON.parse(
            request.options.body
        ),
        {
            p_facility_id:
                "11111111-1111-1111-1111-111111111111",
            p_connector_id:
                "22222222-2222-2222-2222-222222222222",
            p_source_document_key:
                "document-1",
            p_source_updated_at:
                "2026-09-15T02:30:00.000Z",
            p_source_size:
                9520
        }
    );
});

test("preserves reviewed deferred and no_match links without residentId", async () => {
    const {
        repository
    } = createRepository({
        result: [
            {
                identifier_type:
                    "name",
                identifier_digest:
                    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                resident_id:
                    null,
                mapping_status:
                    "deferred",
                reviewed_by_human:
                    true,
                reviewed_at:
                    "2026-09-15T03:01:00.000Z"
            },
            {
                identifier_type:
                    "name",
                identifier_digest:
                    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                resident_id:
                    null,
                mapping_status:
                    "no_match",
                reviewed_by_human:
                    true,
                reviewed_at:
                    "2026-09-15T03:02:00.000Z"
            }
        ]
    });

    const result =
        await repository.list({
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId:
                "connector-1",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.deepStrictEqual(
        result.mappings.map(mapping => ({
            identifierType:
                mapping.identifierType,
            identifierDigest:
                mapping.identifierDigest,
            residentId:
                mapping.residentId,
            mappingStatus:
                mapping.mappingStatus,
            reviewedByHuman:
                mapping.reviewedByHuman
        })),
        [
            {
                identifierType:
                    "name",
                identifierDigest:
                    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                residentId:
                    null,
                mappingStatus:
                    "deferred",
                reviewedByHuman:
                    true
            },
            {
                identifierType:
                    "name",
                identifierDigest:
                    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                residentId:
                    null,
                mappingStatus:
                    "no_match",
                reviewedByHuman:
                    true
            }
        ]
    );
});

test("rejects invalid resident-link rows from Supabase", async () => {
    const invalidRows = [
        {
            identifier_type:
                "name",
            identifier_digest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            resident_id:
                null,
            mapping_status:
                "confirmed",
            reviewed_by_human:
                true,
            reviewed_at:
                "2026-09-15T03:00:00.000Z"
        },
        {
            identifier_type:
                "name",
            identifier_digest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            resident_id:
                "33333333-3333-3333-3333-333333333333",
            mapping_status:
                "matched",
            reviewed_by_human:
                true,
            reviewed_at:
                "2026-09-15T03:00:00.000Z"
        },
        {
            identifier_type:
                "name",
            identifier_digest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            resident_id:
                null,
            mapping_status:
                "deferred",
            reviewed_by_human:
                false,
            reviewed_at:
                "2026-09-15T03:00:00.000Z"
        }
    ];

    for (const row of invalidRows) {
        const {
            repository
        } = createRepository({
            result: [row]
        });

        await assert.rejects(
            repository.list({
                verifiedFacilityId:
                    "facility-1",
                verifiedConnectorId:
                    "connector-1",
                sourceDocumentKey:
                    "document-1",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            })
        );
    }
});
