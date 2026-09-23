"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Repository = require("./SupabaseConnectorResidentProfileRepository");

const digest = "a".repeat(64);

function createRepository(fetchImpl) {
    return new Repository({
        supabaseUrl: "https://example.supabase.co/",
        apiKey: "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-access-token";
            }
        },
        fetchImpl
    });
}

function validInput() {
    return {
        verifiedFacilityId: " facility-1 ",
        verifiedConnectorId: " connector-1 ",
        sourceDocumentKey: " source.xlsx ",
        identifierType: "name",
        identifierDigest: digest,
        name: " Test Resident ",
        residentProfile: {
            name: " Test Resident ",
            birth_date: "1977-02-22",
            gender: " 男性 ",
            user_code: " U-001 "
        },
        sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
        sourceSize: 1234
    };
}

test("calls atomic resident profile fill RPC with verified scope and exact snapshot", async () => {
    let request;

    const repository = createRepository(async (url, options) => {
        request = { url, options };

        return {
            ok: true,
            async json() {
                return [{
                    status: "filled",
                    resident_id: "resident-1"
                }];
            }
        };
    });

    const result = await repository.fill(validInput());

    assert.strictEqual(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/fill_connector_resident_profile"
    );

    assert.deepStrictEqual(JSON.parse(request.options.body), {
        p_facility_id: "facility-1",
        p_connector_id: "connector-1",
        p_source_document_key: "source.xlsx",
        p_identifier_type: "name",
        p_identifier_digest: digest,
        p_name: "Test Resident",
        p_birth_date: "1977-02-22",
        p_gender: "男性",
        p_user_code: "U-001",
        p_source_updated_at: "2026-09-22T01:02:03.000Z",
        p_source_size: 1234
    });

    assert.deepStrictEqual(result, {
        status: "filled",
        residentId: "resident-1"
    });
});

test("sends absent optional profile fields as null", async () => {
    let body;

    const repository = createRepository(async (url, options) => {
        body = JSON.parse(options.body);

        return {
            ok: true,
            async json() {
                return [{
                    status: "unchanged",
                    resident_id: "resident-1"
                }];
            }
        };
    });

    const input = validInput();
    input.residentProfile = {
        name: " Test Resident ",
        gender: " 男性 "
    };

    await repository.fill(input);

    assert.strictEqual(body.p_birth_date, null);
    assert.strictEqual(body.p_gender, "男性");
    assert.strictEqual(body.p_user_code, null);
});

test("preserves all resident profile fill statuses", async () => {
    for (const status of [
        "filled",
        "unchanged",
        "conflict",
        "user_code_conflict",
        "stale",
        "not_confirmed"
    ]) {
        const repository = createRepository(async () => ({
            ok: true,
            async json() {
                return [{
                    status,
                    resident_id:
                        ["filled", "unchanged", "conflict", "user_code_conflict"]
                            .includes(status)
                            ? "resident-1"
                            : null
                }];
            }
        }));

        const result = await repository.fill(validInput());

        assert.strictEqual(result.status, status);
    }
});

test("rejects unknown resident profile fields before fetch", async () => {
    let fetchCount = 0;

    const repository = createRepository(async () => {
        fetchCount += 1;
    });

    const input = validInput();
    input.residentProfile.active = "true";

    await assert.rejects(
        repository.fill(input),
        /resident profile fill request is invalid/
    );

    assert.strictEqual(fetchCount, 0);
});

test("rejects ambiguous or impossible birth dates before fetch", async () => {
    for (const birthDate of [
        "2/22/77",
        "1977-2-22",
        "2026-02-30"
    ]) {
        let fetchCount = 0;

        const repository = createRepository(async () => {
            fetchCount += 1;
        });

        const input = validInput();
        input.residentProfile.birth_date = birthDate;

        await assert.rejects(
            repository.fill(input),
            /resident profile fill request is invalid/
        );

        assert.strictEqual(fetchCount, 0);
    }
});

test("rejects profile name that differs from confirmed name", async () => {
    let fetchCount = 0;

    const repository = createRepository(async () => {
        fetchCount += 1;
    });

    const input = validInput();
    input.residentProfile.name = "Other Resident";

    await assert.rejects(
        repository.fill(input),
        /resident profile fill request is invalid/
    );

    assert.strictEqual(fetchCount, 0);
});

test("rejects invalid RPC result", async () => {
    const repository = createRepository(async () => ({
        ok: true,
        async json() {
            return [{
                status: "unexpected",
                resident_id: "resident-1"
            }];
        }
    }));

    await assert.rejects(
        repository.fill(validInput()),
        /Supabase resident profile fill returned invalid status/
    );
});
