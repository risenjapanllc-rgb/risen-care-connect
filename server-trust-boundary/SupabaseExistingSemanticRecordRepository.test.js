"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseExistingSemanticRecordRepository =
    require("./SupabaseExistingSemanticRecordRepository");

const HASH = "a".repeat(64);
const VERSION =
    "risen-semantic-canonicalization-1";

function createRepository() {
    return new SupabaseExistingSemanticRecordRepository({
        supabaseUrl: "https://example.supabase.co/",
        apiKey: "publishable-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "trusted-access-token";
            }
        }
    });
}

test("incomplete trusted lookup scope returns null without fetch", async () => {
    const originalFetch = global.fetch;
    let fetchCalls = 0;

    global.fetch = async () => {
        fetchCalls += 1;
        throw new Error("fetch must not run");
    };

    try {
        const repository = createRepository();

        for (const input of [
            {},
            {
                facilityId: "",
                recordId: "record-1"
            },
            {
                facilityId: "facility-1",
                recordId: "   "
            }
        ]) {
            assert.strictEqual(
                await repository.getByRecordId(input),
                null
            );
        }

        assert.strictEqual(fetchCalls, 0);
    } finally {
        global.fetch = originalFetch;
    }
});

test("complete trusted lookup scope calls exact RPC", async () => {
    const originalFetch = global.fetch;
    const calls = [];

    global.fetch = async (url, options) => {
        calls.push({ url, options });

        return {
            ok: true,
            async json() {
                return [];
            }
        };
    };

    try {
        const repository = createRepository();

        const result =
            await repository.getByRecordId({
                facilityId: "facility-1",
                recordId: "record-1"
            });

        assert.strictEqual(result, null);
        assert.strictEqual(calls.length, 1);

        assert.strictEqual(
            calls[0].url,
            "https://example.supabase.co/rest/v1/rpc/get_existing_semantic_record_state"
        );

        assert.deepStrictEqual(
            JSON.parse(calls[0].options.body),
            {
                p_facility_id: "facility-1",
                p_record_id: "record-1"
            }
        );

        assert.strictEqual(
            calls[0].options.headers.apikey,
            "publishable-key"
        );

        assert.strictEqual(
            calls[0].options.headers.Authorization,
            "Bearer trusted-access-token"
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("repository exposes only required existing state", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    record_id: "record-1",
                    content_hash: HASH,
                    canonicalization_version:
                        VERSION,
                    resident_id:
                        "must-not-propagate",
                    semantic_content:
                        "must-not-propagate",
                    source_document_key:
                        "must-not-propagate"
                }
            ];
        }
    });

    try {
        const repository = createRepository();

        assert.deepStrictEqual(
            await repository.getByRecordId({
                facilityId: "facility-1",
                recordId: "record-1"
            }),
            {
                recordId: "record-1",
                contentHash: HASH,
                canonicalizationVersion:
                    VERSION
            }
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("non-array RPC result is rejected", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return {};
        }
    });

    try {
        const repository = createRepository();

        await assert.rejects(
            () =>
                repository.getByRecordId({
                    facilityId: "facility-1",
                    recordId: "record-1"
                }),
            /invalid result/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("multiple RPC rows are rejected", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    record_id: "record-1",
                    content_hash: HASH,
                    canonicalization_version:
                        VERSION
                },
                {
                    record_id: "record-1",
                    content_hash: HASH,
                    canonicalization_version:
                        VERSION
                }
            ];
        }
    });

    try {
        const repository = createRepository();

        await assert.rejects(
            () =>
                repository.getByRecordId({
                    facilityId: "facility-1",
                    recordId: "record-1"
                }),
            /ambiguous result/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("malformed existing state is rejected", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    record_id: "record-1",
                    content_hash: "INVALID",
                    canonicalization_version:
                        VERSION
                }
            ];
        }
    });

    try {
        const repository = createRepository();

        await assert.rejects(
            () =>
                repository.getByRecordId({
                    facilityId: "facility-1",
                    recordId: "record-1"
                }),
            /invalid record/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("mismatched recordId is rejected", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    record_id: "different-record",
                    content_hash: HASH,
                    canonicalization_version:
                        VERSION
                }
            ];
        }
    });

    try {
        const repository = createRepository();

        await assert.rejects(
            () =>
                repository.getByRecordId({
                    facilityId: "facility-1",
                    recordId: "record-1"
                }),
            /mismatched record/
        );
    } finally {
        global.fetch = originalFetch;
    }
});
