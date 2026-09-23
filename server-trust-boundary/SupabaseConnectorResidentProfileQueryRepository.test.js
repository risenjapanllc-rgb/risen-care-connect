"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Repository =
    require("./SupabaseConnectorResidentProfileQueryRepository");

const digest = "a".repeat(64);

const input = {
    verifiedFacilityId: "facility-1",
    verifiedConnectorId: "connector-1",
    sourceDocumentKey: "source.xlsx",
    identifierType: "name",
    identifierDigest: digest,
    sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
    sourceSize: 1234
};

function createRepository(fetchImpl) {
    return new Repository({
        supabaseUrl: "https://example.supabase.co/",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-token";
            }
        },
        fetchImpl
    });
}

test("queries exact confirmed source identity with trusted scope", async () => {
    let request;

    const repository = createRepository(async (url, options) => {
        request = { url, options };

        return {
            ok: true,
            async json() {
                return [{
                    resident_id: "resident-1",
                    name: "山田 太郎",
                    birth_date: null,
                    gender: "男性",
                    user_code: null
                }];
            }
        };
    });

    const result = await repository.get(input);

    assert.equal(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/get_connector_resident_profile"
    );

    assert.deepEqual(JSON.parse(request.options.body), {
        p_facility_id: input.verifiedFacilityId,
        p_connector_id: input.verifiedConnectorId,
        p_source_document_key: input.sourceDocumentKey,
        p_identifier_type: input.identifierType,
        p_identifier_digest: digest,
        p_source_updated_at: input.sourceUpdatedAt,
        p_source_size: input.sourceSize
    });

    assert.equal(request.options.method, "POST");
    assert.equal(
        request.options.headers.Authorization,
        "Bearer test-token"
    );

    assert.deepEqual(result, {
        residentId: "resident-1",
        name: "山田 太郎",
        birth_date: null,
        gender: "男性",
        user_code: null
    });
});

test("zero rows means unavailable, not an empty profile", async () => {
    const repository = createRepository(async () => ({
        ok: true,
        async json() {
            return [];
        }
    }));

    assert.equal(await repository.get(input), null);
});

test("rejects multiple rows", async () => {
    const repository = createRepository(async () => ({
        ok: true,
        async json() {
            return [{}, {}];
        }
    }));

    await assert.rejects(repository.get(input));
});

test("rejects invalid profile dates", async () => {
    const repository = createRepository(async () => ({
        ok: true,
        async json() {
            return [{
                resident_id: "resident-1",
                name: "山田 太郎",
                birth_date: "2026-02-30",
                gender: null,
                user_code: null
            }];
        }
    }));

    await assert.rejects(repository.get(input));
});

test("rejects invalid identity before fetch", async () => {
    let called = false;

    const repository = createRepository(async () => {
        called = true;
        throw new Error("unexpected fetch");
    });

    await assert.rejects(
        repository.get({
            ...input,
            identifierDigest: "invalid"
        })
    );

    assert.equal(called, false);
});

test("does not interpret HTTP errors as missing profiles", async () => {
    const repository = createRepository(async () => ({
        ok: false,
        status: 403
    }));

    await assert.rejects(repository.get(input), /403/);
});
