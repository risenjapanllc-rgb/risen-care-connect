"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Repository =
    require("./SupabaseResidentCreationRepository");

function createRepository(fetchImpl) {
    return new Repository({
        supabaseUrl:
            "https://example.supabase.co/",
        apiKey:
            "test-api-key",
        accessTokenProvider: {
            async getAccessToken() {
                return "test-access-token";
            }
        },
        fetchImpl
    });
}

test("creates resident only with verified scope", async () => {
    let request = null;

    const repository =
        createRepository(
            async (url, options) => {
                request = {
                    url,
                    options
                };

                return {
                    ok: true,
                    async json() {
                        return [{
                            resident_id:
                                "resident-1",
                            user_code:
                                null,
                            name:
                                "Test Resident",
                            kana:
                                null,
                            birth_date:
                                null,
                            created:
                                true
                        }];
                    }
                };
            }
        );

    const result =
        await repository.create({
            verifiedFacilityId:
                " facility-1 ",
            verifiedConnectorId:
                " connector-1 ",
            name:
                " Test Resident "
        });

    assert.strictEqual(
        request.url,
        "https://example.supabase.co/rest/v1/rpc/create_connector_resident"
    );

    assert.deepStrictEqual(
        JSON.parse(request.options.body),
        {
            p_facility_id:
                "facility-1",
            p_connector_id:
                "connector-1",
            p_name:
                "Test Resident"
        }
    );

    assert.deepStrictEqual(
        result,
        {
            status: "created",
            resident: {
                residentId:
                    "resident-1",
                userCode:
                    null,
                name:
                    "Test Resident",
                kana:
                    null,
                birthDate:
                    null
            }
        }
    );
});

test("maps existing exact-name resident without claiming creation", async () => {
    const repository =
        createRepository(async () => ({
            ok: true,
            async json() {
                return [{
                    resident_id:
                        "resident-1",
                    user_code:
                        "U001",
                    name:
                        "Test Resident",
                    kana:
                        "テスト",
                    birth_date:
                        "2000-01-01",
                    created:
                        false
                }];
            }
        }));

    const result =
        await repository.create({
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId:
                "connector-1",
            name:
                "Test Resident"
        });

    assert.strictEqual(
        result.status,
        "existing"
    );

    assert.strictEqual(
        result.resident.residentId,
        "resident-1"
    );
});

test("maps PostgreSQL cardinality violation to resident ambiguity", async () => {
    const repository =
        createRepository(async () => ({
            ok: false,
            status: 400,
            async json() {
                return {
                    code: "21000",
                    message:
                        "multiple active residents have the same name"
                };
            }
        }));

    await assert.rejects(
        repository.create({
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId:
                "connector-1",
            name:
                "Test Resident"
        }),
        error =>
            error?.code ===
            "resident_name_ambiguous"
    );
});

test("rejects invalid verified scope or blank name before fetch", async () => {
    let fetchCount = 0;

    const repository =
        createRepository(async () => {
            fetchCount += 1;
            throw new Error(
                "fetch must not be called"
            );
        });

    for (const input of [
        {
            verifiedFacilityId: "",
            verifiedConnectorId:
                "connector-1",
            name:
                "Test Resident"
        },
        {
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId: "",
            name:
                "Test Resident"
        },
        {
            verifiedFacilityId:
                "facility-1",
            verifiedConnectorId:
                "connector-1",
            name: "   "
        }
    ]) {
        await assert.rejects(
            repository.create(input),
            TypeError
        );
    }

    assert.strictEqual(
        fetchCount,
        0
    );
});
