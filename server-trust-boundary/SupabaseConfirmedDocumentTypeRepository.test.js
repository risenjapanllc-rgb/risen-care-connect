"use strict";

const assert = require("assert");
const test = require("node:test");
const SupabaseConfirmedDocumentTypeRepository =
    require("./SupabaseConfirmedDocumentTypeRepository");

function createRepository(fetchImpl) {
    return new SupabaseConfirmedDocumentTypeRepository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-access-token";
            }
        },
        fetchImpl
    });
}

const scope = {
    verifiedFacilityId: "11111111-1111-4111-8111-111111111111",
    verifiedConnectorId: "22222222-2222-4222-8222-222222222222",
    sourceDocumentKey: "source-document",
    sourceUpdatedAt: "2026-09-20T01:02:03.000Z",
    sourceSize: 1234
};

test("save calls snapshot-scoped upsert RPC", async () => {
    let request = null;

    const repository = createRepository(async (url, options) => {
        request = { url, options };
        return {
            ok: true,
            async json() {
                return [{ status: "created" }];
            }
        };
    });

    const result = await repository.save({
        ...scope,
        documentType: "recipient_certificate",
        confirmedAt: "2026-09-20T02:03:04.000Z"
    });

    assert.deepStrictEqual(result, { status: "created" });
    assert.match(
        request.url,
        /\/rpc\/upsert_connector_confirmed_document_type$/
    );

    const body = JSON.parse(request.options.body);

    assert.deepStrictEqual(body, {
        p_facility_id: scope.verifiedFacilityId,
        p_connector_id: scope.verifiedConnectorId,
        p_source_document_key: scope.sourceDocumentKey,
        p_document_type: "recipient_certificate",
        p_confirmed_at: "2026-09-20T02:03:04.000Z",
        p_source_updated_at: scope.sourceUpdatedAt,
        p_source_size: scope.sourceSize
    });
});

test("get calls exact-snapshot lookup RPC", async () => {
    let request = null;

    const repository = createRepository(async (url, options) => {
        request = { url, options };
        return {
            ok: true,
            async json() {
                return [{
                    document_type: "recipient_certificate",
                    confirmed_at: "2026-09-20T02:03:04.000Z"
                }];
            }
        };
    });

    const result = await repository.get(scope);

    assert.deepStrictEqual(result, {
        status: "found",
        confirmation: {
            documentType: "recipient_certificate",
            confirmedAt: "2026-09-20T02:03:04.000Z"
        }
    });

    assert.match(
        request.url,
        /\/rpc\/get_connector_confirmed_document_type$/
    );

    const body = JSON.parse(request.options.body);

    assert.deepStrictEqual(body, {
        p_facility_id: scope.verifiedFacilityId,
        p_connector_id: scope.verifiedConnectorId,
        p_source_document_key: scope.sourceDocumentKey,
        p_source_updated_at: scope.sourceUpdatedAt,
        p_source_size: scope.sourceSize
    });
});

test("get returns not_found for an empty RPC result", async () => {
    const repository = createRepository(async () => ({
        ok: true,
        async json() {
            return [];
        }
    }));

    const result = await repository.get(scope);

    assert.deepStrictEqual(result, {
        status: "not_found",
        confirmation: null
    });
});

test("save fails closed on an invalid RPC result", async () => {
    const repository = createRepository(async () => ({
        ok: true,
        async json() {
            return [{ status: "unexpected" }];
        }
    }));

    await assert.rejects(
        repository.save({
            ...scope,
            documentType: "recipient_certificate",
            confirmedAt: "2026-09-20T02:03:04.000Z"
        }),
        /invalid result/
    );
});

test("get fails closed on ambiguous RPC results", async () => {
    const repository = createRepository(async () => ({
        ok: true,
        async json() {
            return [
                {
                    document_type: "recipient_certificate",
                    confirmed_at: "2026-09-20T02:03:04.000Z"
                },
                {
                    document_type: "support_record",
                    confirmed_at: "2026-09-20T02:03:05.000Z"
                }
            ];
        }
    }));

    await assert.rejects(
        repository.get(scope),
        /ambiguous result/
    );
});
