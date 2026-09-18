"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Repository =
    require("./SupabaseSourceRecordIdentityMappingRepository");

function repository(fetchImpl) {
    return new Repository({
        supabaseUrl: "https://example.supabase.co",
        apiKey: "publishable-test-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "trust-token";
            }
        },
        fetchImpl
    });
}

const scope = {
    verifiedFacilityId: "facility-1",
    verifiedConnectorId: "connector-1",
    sourceDocumentKey: "document-1",
    sourceUpdatedAt: "2026-09-17T00:00:00.000Z",
    sourceSize: 15089594
};

test("save sends exact trusted snapshot contract", async () => {
    let captured = null;

    const repo =
        repository(async (url, options) => {
            captured = { url, options };

            return {
                ok: true,
                async json() {
                    return [{ status: "created" }];
                }
            };
        });

    const result =
        await repo.save({
            ...scope,
            sourceFieldKey: "sheet:0:column:0",
            sheetName: "csv",
            headerLabel: "ID",
            confirmedAt:
                "2026-09-17T01:00:00.000Z"
        });

    assert.deepStrictEqual(result, {
        status: "created"
    });

    assert.match(
        captured.url,
        /upsert_connector_source_record_identity_mapping$/
    );

    assert.deepStrictEqual(
        JSON.parse(captured.options.body),
        {
            p_facility_id: "facility-1",
            p_connector_id: "connector-1",
            p_source_document_key: "document-1",
            p_source_field_key: "sheet:0:column:0",
            p_sheet_name: "csv",
            p_header_label: "ID",
            p_confirmed_at:
                "2026-09-17T01:00:00.000Z",
            p_source_updated_at:
                "2026-09-17T00:00:00.000Z",
            p_source_size: 15089594
        }
    );
});

test("get returns one confirmed identity mapping", async () => {
    const repo =
        repository(async () => ({
            ok: true,
            async json() {
                return [{
                    source_field_key:
                        "sheet:0:column:0",
                    sheet_name: "csv",
                    header_label: "ID",
                    confirmed_at:
                        "2026-09-17T01:00:00.000Z"
                }];
            }
        }));

    assert.deepStrictEqual(
        await repo.get(scope),
        {
            status: "found",
            mapping: {
                sourceFieldKey:
                    "sheet:0:column:0",
                sheetName: "csv",
                headerLabel: "ID",
                confirmedAt:
                    "2026-09-17T01:00:00.000Z"
            }
        }
    );
});

test("get returns not_found without inventing identity", async () => {
    const repo =
        repository(async () => ({
            ok: true,
            async json() {
                return [];
            }
        }));

    assert.deepStrictEqual(
        await repo.get(scope),
        {
            status: "not_found",
            mapping: null
        }
    );
});

test("invalid snapshot scope is rejected before fetch", async () => {
    let called = false;

    const repo =
        repository(async () => {
            called = true;
        });

    await assert.rejects(
        repo.get({
            ...scope,
            sourceSize: -1
        }),
        TypeError
    );

    assert.equal(called, false);
});

test("blank source identity field is rejected before fetch", async () => {
    let called = false;

    const repo =
        repository(async () => {
            called = true;
        });

    await assert.rejects(
        repo.save({
            ...scope,
            sourceFieldKey: " ",
            confirmedAt:
                "2026-09-17T01:00:00.000Z"
        }),
        TypeError
    );

    assert.equal(called, false);
});

test("ambiguous query result is rejected", async () => {
    const row = {
        source_field_key: "sheet:0:column:0",
        sheet_name: "csv",
        header_label: "ID",
        confirmed_at:
            "2026-09-17T01:00:00.000Z"
    };

    const repo =
        repository(async () => ({
            ok: true,
            async json() {
                return [row, row];
            }
        }));

    await assert.rejects(
        repo.get(scope),
        /ambiguous result/
    );
});

test("malformed query row is rejected", async () => {
    const repo =
        repository(async () => ({
            ok: true,
            async json() {
                return [{
                    source_field_key: "",
                    confirmed_at:
                        "2026-09-17T01:00:00.000Z"
                }];
            }
        }));

    await assert.rejects(
        repo.get(scope),
        /invalid row/
    );
});
