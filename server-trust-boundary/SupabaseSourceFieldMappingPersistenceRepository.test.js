"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseSourceFieldMappingPersistenceRepository =
    require("./SupabaseSourceFieldMappingPersistenceRepository");

function createRepository() {
    return new SupabaseSourceFieldMappingPersistenceRepository({
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
        sourceFieldKey:
            "sheet:0:column:3",
        standardEntityName:
            "user",
        standardFieldName:
            "blood_type",
        sheetName:
            "Sheet1",
        headerLabel:
            "血液型",
        confirmedAt:
            "2026-09-12T01:00:00.000Z"
    };
}

test("requires constructor dependencies", () => {
    assert.throws(
        () =>
            new SupabaseSourceFieldMappingPersistenceRepository(),
        /requires supabaseUrl/
    );
});

test("rejects invalid input before RPC", async () => {
    const repository =
        createRepository();

    const result =
        await repository.upsert({
            ...validInput(),
            sourceFieldKey: ""
        });

    assert.deepStrictEqual(
        result,
        {
            status:
                "invalid"
        }
    );
});

test("calls source field mapping RPC and returns created status", async () => {
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
            "https://example.supabase.co/rest/v1/rpc/upsert_connector_source_field_mapping"
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
                p_source_field_key:
                    "sheet:0:column:3",
                p_standard_entity_name:
                    "user",
                p_standard_field_name:
                    "blood_type",
                p_sheet_name:
                    "Sheet1",
                p_header_label:
                    "血液型",
                p_confirmed_at:
                    "2026-09-12T01:00:00.000Z"
            }
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});

test("accepts lifecycle denied and invalid statuses", async () => {
    const originalFetch =
        global.fetch;

    try {
        for (
            const status
            of [
                "updated",
                "unchanged",
                "denied",
                "invalid"
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

test("rejects invalid RPC result shape", async () => {
    const originalFetch =
        global.fetch;

    global.fetch =
        async () => ({
            ok: true,
            async json() {
                return [];
            }
        });

    try {
        const repository =
            createRepository();

        await assert.rejects(
            repository.upsert(
                validInput()
            ),
            /invalid result/
        );
    } finally {
        global.fetch =
            originalFetch;
    }
});
