"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SupabaseSourceTemplateExactPersistenceRepository =
    require("./SupabaseSourceTemplateExactPersistenceRepository");

function createRepository() {
    return new SupabaseSourceTemplateExactPersistenceRepository({
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
        displayName:
            "利用者台帳",
        fileType:
            "csv",
        documentType:
            "resident_master",
        structureFingerprint:
            "a".repeat(64),
        canonicalizationVersion:
            "risen-source-template-canonicalization-1",
        canonicalStructure: {
            type:
                "csv",
            fields: [
                {
                    columnIndex: 0,
                    headerLabel:
                        "利用者番号"
                }
            ]
        }
    };
}

test(
    "calls exact template RPC",
    async () => {
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
                                "created",
                            template_id:
                                "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
                        }];
                    }
                };
            };

        try {
            const repository =
                createRepository();

            const result =
                await repository
                    .getOrCreate(
                        validInput()
                    );

            assert.deepEqual(
                result,
                {
                    status:
                        "created",
                    templateId:
                        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
                }
            );

            assert.equal(
                received.url,
                "https://example.supabase.co/rest/v1/rpc/get_or_create_source_template_exact"
            );

            const body =
                JSON.parse(
                    received.options.body
                );

            assert.deepEqual(
                body,
                {
                    p_facility_id:
                        "11111111-1111-1111-1111-111111111111",
                    p_connector_id:
                        "22222222-2222-2222-2222-222222222222",
                    p_display_name:
                        "利用者台帳",
                    p_file_type:
                        "csv",
                    p_document_type:
                        "resident_master",
                    p_structure_fingerprint:
                        "a".repeat(64),
                    p_canonicalization_version:
                        "risen-source-template-canonicalization-1",
                    p_canonical_structure: {
                        type:
                            "csv",
                        fields: [
                            {
                                columnIndex: 0,
                                headerLabel:
                                    "利用者番号"
                            }
                        ]
                    }
                }
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);

test(
    "accepts all exact template lifecycle statuses",
    async () => {
        const originalFetch =
            global.fetch;

        try {
            for (
                const status
                of [
                    "created",
                    "unchanged",
                    "conflict",
                    "denied",
                    "invalid"
                ]
            ) {
                global.fetch =
                    async () => ({
                        ok: true,

                        async json() {
                            return [{
                                status,

                                template_id:
                                    [
                                        "created",
                                        "unchanged",
                                        "conflict"
                                    ].includes(
                                        status
                                    )
                                        ? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
                                        : null
                            }];
                        }
                    });

                const repository =
                    createRepository();

                const result =
                    await repository
                        .getOrCreate(
                            validInput()
                        );

                assert.equal(
                    result.status,
                    status
                );
            }
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);

test(
    "rejects lifecycle status without required template id",
    async () => {
        const originalFetch =
            global.fetch;

        global.fetch =
            async () => ({
                ok: true,

                async json() {
                    return [{
                        status:
                            "created",
                        template_id:
                            null
                    }];
                }
            });

        try {
            await assert.rejects(
                createRepository()
                    .getOrCreate(
                        validInput()
                    ),
                /invalid template id/
            );
        } finally {
            global.fetch =
                originalFetch;
        }
    }
);
