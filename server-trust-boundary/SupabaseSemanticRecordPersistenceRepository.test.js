"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseSemanticRecordPersistenceRepository =
    require("./SupabaseSemanticRecordPersistenceRepository");

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const VERSION =
    "risen-semantic-canonicalization-1";

function semanticContent() {
    return {
        semanticType: "support_record",
        fields: {
            supportContent: "支援内容"
        },
        customFields: {}
    };
}

function createRepository({
    accessToken = "trusted-access-token"
} = {}) {
    return new SupabaseSemanticRecordPersistenceRepository({
        supabaseUrl: "https://example.supabase.co/",
        apiKey: "publishable-key",
        accessTokenProvider: {
            async getAccessToken() {
                return accessToken;
            }
        }
    });
}

function createInput() {
    return {
        verifiedFacilityId: "facility-1",
        verifiedConnectorId: "connector-1",
        residentId: "resident-1",
        sourceDocumentKey: "document-1",
        sourceRecordKey: "support_record:primary",
        contentHash: HASH_A,
        canonicalizationVersion: VERSION,
        semanticContent: semanticContent()
    };
}

function updateInput() {
    return {
        verifiedFacilityId: "facility-1",
        verifiedConnectorId: "connector-1",
        recordId: "record-1",
        expectedContentHash: HASH_A,
        contentHash: HASH_B,
        canonicalizationVersion: VERSION,
        semanticContent: semanticContent()
    };
}

test("constructor requires trusted Supabase configuration", () => {
    assert.throws(
        () =>
            new SupabaseSemanticRecordPersistenceRepository({
                apiKey: "key",
                accessTokenProvider: {
                    getAccessToken() {}
                }
            }),
        /requires supabaseUrl/
    );

    assert.throws(
        () =>
            new SupabaseSemanticRecordPersistenceRepository({
                supabaseUrl: "https://example.supabase.co",
                accessTokenProvider: {
                    getAccessToken() {}
                }
            }),
        /requires apiKey/
    );

    assert.throws(
        () =>
            new SupabaseSemanticRecordPersistenceRepository({
                supabaseUrl: "https://example.supabase.co",
                apiKey: "key"
            }),
        /requires accessTokenProvider/
    );
});

test("invalid create input fails before token or fetch", async () => {
    let tokenCalls = 0;
    let fetchCalls = 0;

    const repository =
        new SupabaseSemanticRecordPersistenceRepository({
            supabaseUrl: "https://example.supabase.co",
            apiKey: "key",
            accessTokenProvider: {
                async getAccessToken() {
                    tokenCalls += 1;
                    return "token";
                }
            }
        });

    const originalFetch = global.fetch;

    global.fetch = async () => {
        fetchCalls += 1;
        throw new Error("fetch must not run");
    };

    try {
        assert.deepStrictEqual(
            await repository.createConfirmedRecord({}),
            {
                status: "invalid"
            }
        );

        assert.strictEqual(tokenCalls, 0);
        assert.strictEqual(fetchCalls, 0);
    } finally {
        global.fetch = originalFetch;
    }
});

test("create calls exact atomic RPC", async () => {
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
                        status: "created",
                        record_id: "record-1"
                    }
                ];
            }
        };
    };

    try {
        const repository = createRepository();

        assert.deepStrictEqual(
            await repository.createConfirmedRecord(
                createInput()
            ),
            {
                status: "created",
                recordId: "record-1"
            }
        );

        assert.strictEqual(
            capturedUrl,
            "https://example.supabase.co/rest/v1/rpc/create_confirmed_semantic_record"
        );

        assert.strictEqual(
            capturedOptions.headers.Authorization,
            "Bearer trusted-access-token"
        );

        assert.strictEqual(
            capturedOptions.headers.apikey,
            "publishable-key"
        );

        assert.deepStrictEqual(
            JSON.parse(capturedOptions.body),
            {
                p_facility_id: "facility-1",
                p_connector_id: "connector-1",
                p_resident_id: "resident-1",
                p_source_document_key: "document-1",
                p_source_record_key:
                    "support_record:primary",
                p_content_hash: HASH_A,
                p_canonicalization_version: VERSION,
                p_semantic_content:
                    semanticContent()
            }
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("update calls exact atomic RPC", async () => {
    const originalFetch = global.fetch;
    let capturedOptions;

    global.fetch = async (url, options) => {
        assert.strictEqual(
            url,
            "https://example.supabase.co/rest/v1/rpc/update_confirmed_semantic_record"
        );

        capturedOptions = options;

        return {
            ok: true,
            async json() {
                return [
                    {
                        status: "updated",
                        record_id: "record-1"
                    }
                ];
            }
        };
    };

    try {
        const repository = createRepository();

        assert.deepStrictEqual(
            await repository.updateConfirmedRecord(
                updateInput()
            ),
            {
                status: "updated",
                recordId: "record-1"
            }
        );

        assert.deepStrictEqual(
            JSON.parse(capturedOptions.body),
            {
                p_facility_id: "facility-1",
                p_connector_id: "connector-1",
                p_record_id: "record-1",
                p_expected_content_hash: HASH_A,
                p_content_hash: HASH_B,
                p_canonicalization_version: VERSION,
                p_semantic_content:
                    semanticContent()
            }
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("batch persistence sends 100 operations in exactly one RPC", async () => {
    const originalFetch = global.fetch;
    let fetchCalls = 0;
    let capturedUrl;
    let capturedBody;

    global.fetch = async (url, options) => {
        fetchCalls += 1;
        capturedUrl = url;
        capturedBody =
            JSON.parse(options.body);

        return {
            ok: true,
            async json() {
                return [
                    {
                        status: "completed",
                        processed: 100,
                        created: 100,
                        updated: 0,
                        unchanged: 0,
                        failed_index: null,
                        failure_status: null
                    }
                ];
            }
        };
    };

    try {
        const operations =
            Array.from(
                { length: 100 },
                (_, index) => ({
                    action: "create",
                    residentId:
                        "11111111-1111-4111-8111-111111111111",
                    sourceDocumentKey:
                        "document-1",
                    sourceRecordKey:
                        `source-${index + 1}`,
                    contentHash:
                        HASH_A,
                    canonicalizationVersion:
                        VERSION,
                    semanticContent:
                        semanticContent()
                })
            );

        const result =
            await createRepository()
                .persistBatch({
                    verifiedFacilityId:
                        "facility-1",
                    verifiedConnectorId:
                        "connector-1",
                    operations
                });

        assert.deepStrictEqual(
            result,
            {
                status: "completed",
                processed: 100,
                created: 100,
                updated: 0,
                unchanged: 0
            }
        );

        assert.strictEqual(
            fetchCalls,
            1
        );

        assert.match(
            capturedUrl,
            /\/rest\/v1\/rpc\/persist_connector_semantic_record_batch$/
        );

        assert.strictEqual(
            capturedBody.p_facility_id,
            "facility-1"
        );

        assert.strictEqual(
            capturedBody.p_connector_id,
            "connector-1"
        );

        assert.strictEqual(
            capturedBody.p_operations.length,
            100
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("batch stopped result preserves exact committed prefix", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    status: "stopped",
                    processed: 2,
                    created: 1,
                    updated: 0,
                    unchanged: 1,
                    failed_index: 2,
                    failure_status:
                        "conflict"
                }
            ];
        }
    });

    try {
        const operations =
            Array.from(
                { length: 4 },
                (_, index) => ({
                    action: "create",
                    sourceRecordKey:
                        `source-${index + 1}`
                })
            );

        assert.deepStrictEqual(
            await createRepository()
                .persistBatch({
                    verifiedFacilityId:
                        "facility-1",
                    verifiedConnectorId:
                        "connector-1",
                    operations
                }),
            {
                status: "stopped",
                processed: 2,
                created: 1,
                updated: 0,
                unchanged: 1,
                failedIndex: 2,
                failureStatus:
                    "conflict"
            }
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("batch invalid result never invents progress", async () => {
    const originalFetch = global.fetch;

    try {
        for (const result of [
            [],
            [
                {
                    status: "completed",
                    processed: 99,
                    created: 99,
                    updated: 0,
                    unchanged: 0,
                    failed_index: null,
                    failure_status: null
                }
            ],
            [
                {
                    status: "stopped",
                    processed: 2,
                    created: 2,
                    updated: 0,
                    unchanged: 0,
                    failed_index: 3,
                    failure_status:
                        "conflict"
                }
            ]
        ]) {
            global.fetch = async () => ({
                ok: true,
                async json() {
                    return result;
                }
            });

            await assert.rejects(
                () =>
                    createRepository()
                        .persistBatch({
                            verifiedFacilityId:
                                "facility-1",
                            verifiedConnectorId:
                                "connector-1",
                            operations:
                                Array.from(
                                    { length: 100 },
                                    (_, index) => ({
                                        action:
                                            "create",
                                        sourceRecordKey:
                                            `source-${index + 1}`
                                    })
                                )
                        }),
                /invalid/
            );
        }
    } finally {
        global.fetch = originalFetch;
    }
});

test("batch HTTP failure exposes status only", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: false,
        status: 503
    });

    try {
        await assert.rejects(
            () =>
                createRepository()
                    .persistBatch({
                        verifiedFacilityId:
                            "facility-1",
                        verifiedConnectorId:
                            "connector-1",
                        operations: [
                            {
                                action:
                                    "create"
                            }
                        ]
                    }),
            /failed: 503/
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("denied result exposes no recordId", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    status: "denied",
                    record_id: null
                }
            ];
        }
    });

    try {
        assert.deepStrictEqual(
            await createRepository()
                .createConfirmedRecord(createInput()),
            {
                status: "denied",
                recordId: null
            }
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("resident mismatch is preserved without recordId", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: true,
        async json() {
            return [
                {
                    status: "resident_mismatch",
                    record_id: null
                }
            ];
        }
    });

    try {
        assert.deepStrictEqual(
            await createRepository()
                .createConfirmedRecord(createInput()),
            {
                status: "resident_mismatch",
                recordId: null
            }
        );
    } finally {
        global.fetch = originalFetch;
    }
});

test("malformed and unknown RPC results are rejected", async () => {
    const originalFetch = global.fetch;

    try {
        for (const result of [
            {},
            [],
            [
                {
                    status: "created",
                    record_id: "record-1"
                },
                {
                    status: "created",
                    record_id: "record-2"
                }
            ],
            [
                {
                    status: "invented",
                    record_id: "record-1"
                }
            ],
            [
                {
                    status: "created",
                    record_id: null
                }
            ]
        ]) {
            global.fetch = async () => ({
                ok: true,
                async json() {
                    return result;
                }
            });

            await assert.rejects(
                () =>
                    createRepository()
                        .createConfirmedRecord(
                            createInput()
                        ),
                /invalid|missing/
            );
        }
    } finally {
        global.fetch = originalFetch;
    }
});

test("missing access token fails before fetch", async () => {
    const originalFetch = global.fetch;
    let fetchCalls = 0;

    global.fetch = async () => {
        fetchCalls += 1;
        throw new Error("fetch must not run");
    };

    try {
        await assert.rejects(
            () =>
                createRepository({
                    accessToken: ""
                }).createConfirmedRecord(
                    createInput()
                ),
            /requires access token/
        );

        assert.strictEqual(fetchCalls, 0);
    } finally {
        global.fetch = originalFetch;
    }
});

test("HTTP failure exposes status only", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: false,
        status: 503
    });

    try {
        await assert.rejects(
            () =>
                createRepository()
                    .createConfirmedRecord(
                        createInput()
                    ),
            /failed: 503/
        );
    } finally {
        global.fetch = originalFetch;
    }
});
