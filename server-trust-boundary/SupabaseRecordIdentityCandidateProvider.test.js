"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseRecordIdentityCandidateProvider =
    require("./SupabaseRecordIdentityCandidateProvider");

function createProvider({
    accessToken = "test-token"
} = {}) {
    return new SupabaseRecordIdentityCandidateProvider({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return accessToken;
            }
        }
    });
}

test("incomplete trusted lookup scope returns empty candidates without fetch", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => {
        throw new Error("fetch must not be called");
    };

    try {
        const provider = createProvider();

        assert.deepStrictEqual(
            await provider.findCandidates({
                verifiedFacilityId: "facility-1",
                verifiedConnectorId: "connector-1",
                sourceDocumentKey: "document-1"
            }),
            []
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("complete trusted lookup scope calls RPC with exact four-key identity", async () => {
    const originalFetch = global.fetch;

    let capturedUrl;
    let capturedOptions;

    global.fetch = async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;

        return {
            ok: true,
            async json() {
                return [
                    {
                        record_id: "record-1"
                    }
                ];
            }
        };
    };

    try {
        const provider = createProvider();

        const result =
            await provider.findCandidates({
                verifiedFacilityId: "facility-1",
                verifiedConnectorId: "connector-1",
                sourceDocumentKey: " document-key-1 ",
                sourceRecordKey: " source-record-1 "
            });

        assert.strictEqual(
            capturedUrl,
            "https://example.supabase.co/rest/v1/rpc/get_semantic_record_identity_candidates"
        );

        assert.strictEqual(
            capturedOptions.method,
            "POST"
        );

        assert.strictEqual(
            capturedOptions.headers.apikey,
            "test-api-key"
        );

        assert.strictEqual(
            capturedOptions.headers.Authorization,
            "Bearer test-token"
        );

        assert.deepStrictEqual(
            JSON.parse(capturedOptions.body),
            {
                p_facility_id: "facility-1",
                p_connector_id: "connector-1",
                p_source_document_key:
                    " document-key-1 ",
                p_source_record_key:
                    " source-record-1 "
            }
        );

        assert.deepStrictEqual(
            result,
            [
                {
                    recordId: "record-1"
                }
            ]
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("provider exposes only recordId from RPC result", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    record_id: "record-1",
                    content_hash: "must-not-escape",
                    resident_id: "must-not-escape",
                    file_name: "must-not-escape"
                }
            ];
        }
    });

    try {
        const provider = createProvider();

        const result =
            await provider.findCandidates({
                verifiedFacilityId: "facility-1",
                verifiedConnectorId: "connector-1",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "source-record-1"
            });

        assert.deepStrictEqual(
            result,
            [
                {
                    recordId: "record-1"
                }
            ]
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
        const provider = createProvider();

        await assert.rejects(
            provider.findCandidates({
                verifiedFacilityId: "facility-1",
                verifiedConnectorId: "connector-1",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "source-record-1"
            }),
            /invalid result/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("malformed candidate is rejected", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    record_id: null
                }
            ];
        }
    });

    try {
        const provider = createProvider();

        await assert.rejects(
            provider.findCandidates({
                verifiedFacilityId: "facility-1",
                verifiedConnectorId: "connector-1",
                sourceDocumentKey: "document-1",
                sourceRecordKey: "source-record-1"
            }),
            /invalid candidate/
        );
    } finally {
        global.fetch = originalFetch;
    }
});
