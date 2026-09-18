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

function installSuccessfulStorageFlow(finalStatus) {
    global.fetch =
        async (url) => {
            if (
                url ===
                "https://example.supabase.co/functions/v1/connector-source-document-upload"
            ) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return {
                            bucket:
                                "connector-source-documents",
                            path:
                                "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/snapshot.json",
                            signedUrl:
                                "https://example.supabase.co/storage/v1/object/upload/sign/connector-source-documents/snapshot.json?token=signed-token"
                        };
                    }
                };
            }

            if (
                url ===
                "https://example.supabase.co/storage/v1/object/upload/sign/connector-source-documents/snapshot.json?token=signed-token"
            ) {
                return {
                    ok: true,
                    status: 200
                };
            }

            if (
                url ===
                "https://example.supabase.co/rest/v1/rpc/finalize_connector_source_document_storage"
            ) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return [{
                            status:
                                finalStatus
                        }];
                    }
                };
            }

            throw new Error(
                "unexpected fetch"
            );
        };
}

test("returns created status after storage persistence", async () => {
    const originalFetch =
        global.fetch;

    installSuccessfulStorageFlow(
        "created"
    );

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
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("accepts updated unchanged and denied finalize statuses", async () => {
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
            installSuccessfulStorageFlow(
                status
            );

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

test("rejects unexpected finalize status", async () => {
    const originalFetch =
        global.fetch;

    installSuccessfulStorageFlow(
        "unexpected"
    );

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


test("preserves Supabase HTTP status without exposing response body", async () => {
    const originalFetch =
        global.fetch;

    global.fetch =
        async () => ({
            ok: false,
            status: 413
        });

    try {
        const repository =
            createRepository();

        let caught = null;

        try {
            await repository.upsert(
                validInput()
            );
        } catch (error) {
            caught = error;
        }

        assert.ok(caught);
        assert.strictEqual(
            caught.httpStatus,
            413
        );
        assert.strictEqual(
            String(caught.message)
                .includes("private-response-body"),
            false
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("persists source content through signed storage upload before finalize", async () => {
    const originalFetch =
        global.fetch;

    const calls = [];

    global.fetch =
        async (url, options = {}) => {
            calls.push({
                url,
                options
            });

            if (
                url ===
                "https://example.supabase.co/functions/v1/connector-source-document-upload"
            ) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return {
                            bucket:
                                "connector-source-documents",
                            path:
                                "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/snapshot.json",
                            signedUrl:
                                "https://example.supabase.co/storage/v1/object/upload/sign/connector-source-documents/snapshot.json?token=signed-token"
                        };
                    }
                };
            }

            if (
                url ===
                "https://example.supabase.co/storage/v1/object/upload/sign/connector-source-documents/snapshot.json?token=signed-token"
            ) {
                return {
                    ok: true,
                    status: 200
                };
            }

            if (
                url ===
                "https://example.supabase.co/rest/v1/rpc/finalize_connector_source_document_storage"
            ) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return [{
                            status:
                                "created"
                        }];
                    }
                };
            }

            throw new Error("unexpected fetch");
        };

    try {
        const repository =
            createRepository();

        const input =
            validInput();

        const serializedContent =
            JSON.stringify(
                input.sourceContent
            );

        const result =
            await repository.upsert(
                input
            );

        assert.deepStrictEqual(
            result,
            {
                status:
                    "created"
            }
        );

        assert.strictEqual(
            calls.length,
            3
        );

        assert.strictEqual(
            calls[0].options.method,
            "POST"
        );

        const prepareBody =
            JSON.parse(
                calls[0].options.body
            );

        assert.deepStrictEqual(
            prepareBody,
            {
                facilityId:
                    input.verifiedFacilityId,
                connectorId:
                    input.verifiedConnectorId,
                sourceDocumentKey:
                    input.sourceDocumentKey,
                sourceUpdatedAt:
                    input.sourceUpdatedAt,
                sourceSize:
                    input.sourceSize
            }
        );

        assert.strictEqual(
            calls[0].options.body.includes(
                '"sourceContent"'
            ),
            false
        );

        assert.strictEqual(
            calls[1].options.method,
            "PUT"
        );

        assert.strictEqual(
            calls[1].options.headers["Content-Type"],
            "application/json"
        );

        assert.strictEqual(
            calls[1].options.body,
            serializedContent
        );

        const finalizeBody =
            JSON.parse(
                calls[2].options.body
            );

        assert.strictEqual(
            calls[2].options.method,
            "POST"
        );

        assert.strictEqual(
            finalizeBody.p_storage_size,
            Buffer.byteLength(
                serializedContent,
                "utf8"
            )
        );

        assert.strictEqual(
            calls[2].options.body.includes(
                '"sourceContent"'
            ),
            false
        );

        assert.deepStrictEqual(
            finalizeBody,
            {
                p_facility_id:
                    input.verifiedFacilityId,
                p_connector_id:
                    input.verifiedConnectorId,
                p_source_document_key:
                    input.sourceDocumentKey,
                p_source_type:
                    input.sourceType,
                p_file_name:
                    input.fileName,
                p_source_updated_at:
                    input.sourceUpdatedAt,
                p_source_size:
                    input.sourceSize,
                p_observed_at:
                    input.observedAt,
                p_storage_bucket:
                    "connector-source-documents",
                p_storage_path:
                    "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/snapshot.json",
                p_storage_size:
                    Buffer.byteLength(
                        serializedContent,
                        "utf8"
                    )
            }
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("preserves HTTP status for each storage persistence phase without reading private response body", async () => {
    const originalFetch =
        global.fetch;

    const prepareUrl =
        "https://example.supabase.co/functions/v1/connector-source-document-upload";

    const uploadUrl =
        "https://example.supabase.co/storage/v1/object/upload/sign/connector-source-documents/snapshot.json?token=signed-token";

    const finalizeUrl =
        "https://example.supabase.co/rest/v1/rpc/finalize_connector_source_document_storage";

    const prepared = {
        bucket:
            "connector-source-documents",
        path:
            "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/snapshot.json",
        signedUrl:
            uploadUrl
    };

    const scenarios = [
        {
            failedUrl:
                prepareUrl,
            httpStatus:
                401
        },
        {
            failedUrl:
                uploadUrl,
            httpStatus:
                413
        },
        {
            failedUrl:
                finalizeUrl,
            httpStatus:
                500
        }
    ];

    try {
        for (const scenario of scenarios) {
            global.fetch =
                async (url) => {
                    if (
                        url ===
                        scenario.failedUrl
                    ) {
                        return {
                            ok: false,
                            status:
                                scenario.httpStatus,
                            async json() {
                                throw new Error(
                                    "private-response-body-must-not-be-read"
                                );
                            },
                            async text() {
                                throw new Error(
                                    "private-response-body-must-not-be-read"
                                );
                            }
                        };
                    }

                    if (url === prepareUrl) {
                        return {
                            ok: true,
                            status: 200,
                            async json() {
                                return prepared;
                            }
                        };
                    }

                    if (url === uploadUrl) {
                        return {
                            ok: true,
                            status: 200
                        };
                    }

                    if (url === finalizeUrl) {
                        return {
                            ok: true,
                            status: 200,
                            async json() {
                                return [{
                                    status:
                                        "created"
                                }];
                            }
                        };
                    }

                    throw new Error(
                        "unexpected fetch"
                    );
                };

            const repository =
                createRepository();

            let caught = null;

            try {
                await repository.upsert(
                    validInput()
                );
            } catch (error) {
                caught = error;
            }

            assert.ok(caught);

            assert.strictEqual(
                caught.httpStatus,
                scenario.httpStatus
            );

            assert.strictEqual(
                String(caught.message)
                    .includes(
                        "private-response-body"
                    ),
                false
            );
        }
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("rejects signed upload URL outside Supabase storage boundary", async () => {
    const originalFetch =
        global.fetch;

    global.fetch =
        async () => ({
            ok: true,
            status: 200,
            async json() {
                return {
                    bucket:
                        "connector-source-documents",
                    path:
                        "safe/snapshot.json",
                    signedUrl:
                        "https://example.invalid/storage/v1/object/upload/sign/connector-source-documents/snapshot.json?token=signed-token"
                };
            }
        });

    try {
        const repository =
            createRepository();

        await assert.rejects(
            repository.upsert(
                validInput()
            ),
            /invalid signed URL/
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("uses UTF-8 byte size of the exact uploaded JSON for storage size", async () => {
    const originalFetch =
        global.fetch;

    const input = {
        ...validInput(),
        sourceContent: {
            rows: [
                ["氏名", "状態"],
                ["山田", "確認済み"]
            ]
        }
    };

    const serializedContent =
        JSON.stringify(
            input.sourceContent
        );

    let uploadedBody = null;
    let finalizedStorageSize = null;

    global.fetch =
        async (url, options = {}) => {
            if (
                url ===
                "https://example.supabase.co/functions/v1/connector-source-document-upload"
            ) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return {
                            bucket:
                                "connector-source-documents",
                            path:
                                "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/snapshot.json",
                            signedUrl:
                                "https://example.supabase.co/storage/v1/object/upload/sign/connector-source-documents/snapshot.json?token=signed-token"
                        };
                    }
                };
            }

            if (
                url.includes(
                    "/storage/v1/object/upload/sign/"
                )
            ) {
                uploadedBody =
                    options.body;

                return {
                    ok: true,
                    status: 200
                };
            }

            if (
                url.endsWith(
                    "/rest/v1/rpc/finalize_connector_source_document_storage"
                )
            ) {
                finalizedStorageSize =
                    JSON.parse(
                        options.body
                    ).p_storage_size;

                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return [{
                            status:
                                "created"
                        }];
                    }
                };
            }

            throw new Error(
                "unexpected fetch"
            );
        };

    try {
        const repository =
            createRepository();

        await repository.upsert(
            input
        );

        assert.strictEqual(
            uploadedBody,
            serializedContent
        );

        assert.strictEqual(
            finalizedStorageSize,
            Buffer.byteLength(
                uploadedBody,
                "utf8"
            )
        );

        assert.notStrictEqual(
            finalizedStorageSize,
            uploadedBody.length
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});
