"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Repository =
    require("./SupabaseConnectorSemanticRecordPreviewRepository");

const HASH = "a".repeat(64);
const VERSION =
    "risen-semantic-canonicalization-1";

function createRepository() {
    return new Repository({
        supabaseUrl:
            "https://example.supabase.co/",
        apiKey: "publishable-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "trusted-access-token";
            }
        }
    });
}

test("invalid lookup scope is rejected without fetch", async () => {
    const originalFetch = global.fetch;
    let fetchCalls = 0;

    global.fetch = async () => {
        fetchCalls += 1;
        throw new Error(
            "fetch must not run"
        );
    };

    try {
        const repository =
            createRepository();

        for (const input of [
            {},
            {
                facilityId: "facility-1",
                connectorId: "connector-1",
                sourceDocumentKey: "doc-1",
                sourceRecordKeys: []
            },
            {
                facilityId: "facility-1",
                connectorId: "connector-1",
                sourceDocumentKey: "doc-1",
                sourceRecordKeys: [" "]
            }
        ]) {
            await assert.rejects(
                () =>
                    repository
                        .getBySourceRecordKeys(
                            input
                        ),
                TypeError
            );
        }

        assert.strictEqual(
            fetchCalls,
            0
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("more than 500 keys are rejected", async () => {
    const repository =
        createRepository();

    await assert.rejects(
        () =>
            repository
                .getBySourceRecordKeys({
                    facilityId:
                        "facility-1",
                    connectorId:
                        "connector-1",
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys:
                        Array.from(
                            { length: 501 },
                            (_, index) =>
                                `row-${index}`
                        )
                }),
        TypeError
    );
});

test("duplicate keys are rejected", async () => {
    const repository =
        createRepository();

    await assert.rejects(
        () =>
            repository
                .getBySourceRecordKeys({
                    facilityId:
                        "facility-1",
                    connectorId:
                        "connector-1",
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys: [
                        "row-1",
                        "row-1"
                    ]
                }),
        /unique/
    );
});

test("complete scope calls exact read-only RPC", async () => {
    const originalFetch = global.fetch;
    const calls = [];

    global.fetch =
        async (url, options) => {
            calls.push({
                url,
                options
            });

            return {
                ok: true,
                async json() {
                    return [];
                }
            };
        };

    try {
        const repository =
            createRepository();

        assert.deepStrictEqual(
            await repository
                .getBySourceRecordKeys({
                    facilityId:
                        "facility-1",
                    connectorId:
                        "connector-1",
                    sourceDocumentKey:
                        "document-1",
                    sourceRecordKeys: [
                        "row-1",
                        "row-2"
                    ]
                }),
            []
        );

        assert.strictEqual(
            calls.length,
            1
        );

        assert.strictEqual(
            calls[0].url,
            "https://example.supabase.co/rest/v1/rpc/get_connector_semantic_record_preview_rows"
        );

        assert.deepStrictEqual(
            JSON.parse(
                calls[0].options.body
            ),
            {
                p_facility_id:
                    "facility-1",
                p_connector_id:
                    "connector-1",
                p_source_document_key:
                    "document-1",
                p_source_record_keys: [
                    "row-1",
                    "row-2"
                ]
            }
        );

        assert.strictEqual(
            calls[0].options.headers
                .Authorization,
            "Bearer trusted-access-token"
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("existing rows are returned for internal preview use", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    source_record_key:
                        "row-1",
                    record_id:
                        "record-1",
                    resident_id:
                        "resident-1",
                    semantic_type:
                        "support_record",
                    semantic_content: {
                        semanticType:
                            "support_record",
                        fields: {
                            supportContent:
                                "existing"
                        }
                    },
                    content_hash:
                        HASH,
                    canonicalization_version:
                        VERSION
                }
            ];
        }
    });

    try {
        const repository =
            createRepository();

        const result =
            await repository
                .getBySourceRecordKeys({
                    facilityId:
                        "facility-1",
                    connectorId:
                        "connector-1",
                    sourceDocumentKey:
                        "document-1",
                    sourceRecordKeys: [
                        "row-1"
                    ]
                });

        assert.strictEqual(
            result.length,
            1
        );
        assert.strictEqual(
            result[0].sourceRecordKey,
            "row-1"
        );
        assert.strictEqual(
            result[0].contentHash,
            HASH
        );
        assert.deepStrictEqual(
            result[0].semanticContent,
            {
                semanticType:
                    "support_record",
                fields: {
                    supportContent:
                        "existing"
                }
            }
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("unexpected and duplicate returned keys are rejected", async () => {
    const originalFetch = global.fetch;
    const repository =
        createRepository();

    try {
        global.fetch = async () => ({
            ok: true,
            async json() {
                return [
                    {
                        source_record_key:
                            "other-row",
                        record_id:
                            "record-1",
                        resident_id:
                            "resident-1",
                        semantic_type:
                            "support_record",
                        semantic_content: {},
                        content_hash:
                            HASH,
                        canonicalization_version:
                            VERSION
                    }
                ];
            }
        });

        await assert.rejects(
            () =>
                repository
                    .getBySourceRecordKeys({
                        facilityId:
                            "facility-1",
                        connectorId:
                            "connector-1",
                        sourceDocumentKey:
                            "document-1",
                        sourceRecordKeys: [
                            "row-1"
                        ]
                    }),
            /unexpected source record/
        );

        global.fetch = async () => ({
            ok: true,
            async json() {
                const row = {
                    source_record_key:
                        "row-1",
                    record_id:
                        "record-1",
                    resident_id:
                        "resident-1",
                    semantic_type:
                        "support_record",
                    semantic_content: {},
                    content_hash:
                        HASH,
                    canonicalization_version:
                        VERSION
                };

                return [row, row];
            }
        });

        await assert.rejects(
            () =>
                repository
                    .getBySourceRecordKeys({
                        facilityId:
                            "facility-1",
                        connectorId:
                            "connector-1",
                        sourceDocumentKey:
                            "document-1",
                        sourceRecordKeys: [
                            "row-1"
                        ]
                    }),
            /duplicate source record/
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("malformed RPC result is rejected", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return {};
        }
    });

    try {
        const repository =
            createRepository();

        await assert.rejects(
            () =>
                repository
                    .getBySourceRecordKeys({
                        facilityId:
                            "facility-1",
                        connectorId:
                            "connector-1",
                        sourceDocumentKey:
                            "document-1",
                        sourceRecordKeys: [
                            "row-1"
                        ]
                    }),
            /invalid result/
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});
