"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SupabaseSourceFieldMappingQueryRepository =
    require("./SupabaseSourceFieldMappingQueryRepository");

test(
    "lists confirmed mappings using only verified connector scope",
    async () => {
        let receivedUrl = null;
        let receivedOptions = null;

        const repository =
            new SupabaseSourceFieldMappingQueryRepository({
                supabaseUrl:
                    "https://example.supabase.co/",
                apiKey:
                    "test-api-key",
                accessTokenProvider: {
                    async getAccessToken() {
                        return "test-access-token";
                    }
                },
                async fetchImpl(url, options) {
                    receivedUrl = url;
                    receivedOptions = options;

                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return [
                                {
                                    source_field_key:
                                        "sheet:0:column:2",
                                    standard_entity_name:
                                        "user",
                                    standard_field_name:
                                        "user_code",
                                    sheet_name:
                                        "Sheet1",
                                    header_label:
                                        "Source Identifier",
                                    confirmed_at:
                                        "2026-09-15T01:00:00.000Z"
                                }
                            ];
                        }
                    };
                }
            });

        const result =
            await repository.list({
                verifiedFacilityId:
                    "facility-verified",
                verifiedConnectorId:
                    "connector-verified",
                sourceDocumentKey:
                    " document-key ",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            });

        assert.strictEqual(
            receivedUrl,
            "https://example.supabase.co/rest/v1/rpc/list_connector_source_field_mappings"
        );

        assert.strictEqual(
            receivedOptions.method,
            "POST"
        );

        assert.deepStrictEqual(
            JSON.parse(
                receivedOptions.body
            ),
            {
                p_facility_id:
                    "facility-verified",
                p_connector_id:
                    "connector-verified",
                p_source_document_key:
                    "document-key",
                p_source_updated_at:
                    "2026-09-15T02:30:00.000Z",
                p_source_size:
                    9520
            }
        );

        assert.deepStrictEqual(
            result,
            {
                status: "found",
                mappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "user_code",
                        sheetName:
                            "Sheet1",
                        headerLabel:
                            "Source Identifier",
                        confirmedAt:
                            "2026-09-15T01:00:00.000Z"
                    }
                ]
            }
        );
    }
);

test(
    "rejects missing verified scope without querying Supabase",
    async () => {
        let fetched = false;

        const repository =
            new SupabaseSourceFieldMappingQueryRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey:
                    "test-api-key",
                accessTokenProvider: {
                    async getAccessToken() {
                        return "test-access-token";
                    }
                },
                async fetchImpl() {
                    fetched = true;

                    throw new Error(
                        "must not fetch"
                    );
                }
            });

        const result =
            await repository.list({
                verifiedFacilityId: "",
                verifiedConnectorId:
                    "connector-verified",
                sourceDocumentKey:
                    "document-key"
            });

        assert.deepStrictEqual(
            result,
            {
                status: "invalid"
            }
        );

        assert.strictEqual(
            fetched,
            false
        );
    }
);

test(
    "rejects malformed mapping rows",
    async () => {
        const repository =
            new SupabaseSourceFieldMappingQueryRepository({
                supabaseUrl:
                    "https://example.supabase.co",
                apiKey:
                    "test-api-key",
                accessTokenProvider: {
                    async getAccessToken() {
                        return "test-access-token";
                    }
                },
                async fetchImpl() {
                    return {
                        ok: true,
                        status: 200,
                        async json() {
                            return [
                                {
                                    source_field_key:
                                        "sheet:0:column:2",
                                    standard_entity_name:
                                        "user",
                                    standard_field_name:
                                        "user_code",
                                    confirmed_at:
                                        null
                                }
                            ];
                        }
                    };
                }
            });

        await assert.rejects(
            repository.list({
                verifiedFacilityId:
                    "facility-verified",
                verifiedConnectorId:
                    "connector-verified",
                sourceDocumentKey:
                    "document-key",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            }),
            /invalid row/
        );
    }
);
