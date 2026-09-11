"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseSourceDocumentPersistenceRepository =
    require("./SupabaseSourceDocumentPersistenceRepository");

function createRepository() {
    return new SupabaseSourceDocumentPersistenceRepository({
        supabaseUrl:
            "https://example.supabase.co",
        apiKey:
            "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-access-token";
            }
        }
    });
}

function validInput() {
    return {
        verifiedFacilityId:
            "11111111-1111-1111-1111-111111111111",
        verifiedConnectorId:
            "22222222-2222-2222-2222-222222222222",
        sourceDocumentKey:
            "source-document-key",
        sourceType:
            "csv",
        fileName:
            "source.csv",
        sourceContent: {
            rows: [
                ["A", "B"],
                ["1", "2"]
            ]
        },
        sourceUpdatedAt:
            "2026-09-11T10:00:00.000Z",
        sourceSize:
            123,
        observedAt:
            "2026-09-11T10:01:00.000Z"
    };
}

test("requires constructor dependencies", () => {
    assert.throws(
        () =>
            new SupabaseSourceDocumentPersistenceRepository(),
        /requires supabaseUrl/
    );
});

test("rejects invalid input before RPC", async () => {
    const repository =
        createRepository();

    const result =
        await repository.upsert({
            ...validInput(),
            sourceDocumentKey: ""
        });

    assert.deepStrictEqual(
        result,
        { status: "invalid" }
    );
});

test("calls source document RPC and returns created status", async () => {
    const originalFetch =
        global.fetch;

    let received;

    global.fetch =
        async (url, options) => {
            received = {
                url,
                options
            };

            return {
                ok: true,
                async json() {
                    return [{
                        status:
                            "created"
                    }];
                }
            };
        };

    try {
        const repository =
            createRepository();

        const result =
            await repository.upsert(
                validInput()
            );

        assert.deepStrictEqual(
            result,
            {
                status:
                    "created"
            }
        );

        assert.strictEqual(
            received.url,
            "https://example.supabase.co/rest/v1/rpc/upsert_connector_source_document"
        );

        const body =
            JSON.parse(
                received.options.body
            );

        assert.deepStrictEqual(
            body,
            {
                p_facility_id:
                    "11111111-1111-1111-1111-111111111111",
                p_connector_id:
                    "22222222-2222-2222-2222-222222222222",
                p_source_document_key:
                    "source-document-key",
                p_source_type:
                    "csv",
                p_file_name:
                    "source.csv",
                p_source_content: {
                    rows: [
                        ["A", "B"],
                        ["1", "2"]
                    ]
                },
                p_source_updated_at:
                    "2026-09-11T10:00:00.000Z",
                p_source_size:
                    123,
                p_observed_at:
                    "2026-09-11T10:01:00.000Z"
            }
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("accepts updated unchanged and denied statuses", async () => {
    const originalFetch =
        global.fetch;

    try {
        for (
            const status
            of [
                "updated",
                "unchanged",
                "denied"
            ]
        ) {
            global.fetch =
                async () => ({
                    ok: true,
                    async json() {
                        return [{
                            status
                        }];
                    }
                });

            const repository =
                createRepository();

            const result =
                await repository.upsert(
                    validInput()
                );

            assert.strictEqual(
                result.status,
                status
            );
        }
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("rejects unexpected RPC status", async () => {
    const originalFetch =
        global.fetch;

    global.fetch =
        async () => ({
            ok: true,
            async json() {
                return [{
                    status:
                        "unexpected"
                }];
            }
        });

    try {
        const repository =
            createRepository();

        await assert.rejects(
            repository.upsert(
                validInput()
            ),
            /invalid status/
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});
