"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("./ConnectorResidentProfileService");

const digest = "b".repeat(64);

function request() {
    return {
        connectorId: "transport-connector",
        credential: "secret",
        sourceDocumentKey: "source.xlsx",
        identifierType: "name",
        identifierDigest: digest,
        name: "Test Resident",
        residentProfile: {
            name: "Test Resident",
            birth_date: "1977-02-22",
            gender: "男性"
        },
        sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
        sourceSize: 1234
    };
}

function createService({
    trustResult = {
        status: "verified",
        verifiedContext: {
            facilityId: "verified-facility",
            connectorId: "verified-connector"
        }
    },
    repositoryResult = {
        status: "filled",
        residentId: "resident-1"
    },
    onFill = () => {}
} = {}) {
    return new Service({
        connectorTrustService: {
            async authenticate() {
                return trustResult;
            }
        },
        repository: {
            async fill(input) {
                onFill(input);
                return repositoryResult;
            }
        }
    });
}

test("uses only trust-verified facility and connector scope", async () => {
    let repositoryInput;

    const service = createService({
        onFill(input) {
            repositoryInput = input;
        }
    });

    const result = await service.fill({
        ...request(),
        facilityId: "must-not-pass"
    });

    assert.deepStrictEqual(repositoryInput, {
        verifiedFacilityId: "verified-facility",
        verifiedConnectorId: "verified-connector",
        sourceDocumentKey: "source.xlsx",
        identifierType: "name",
        identifierDigest: digest,
        name: "Test Resident",
        residentProfile: {
            name: "Test Resident",
            birth_date: "1977-02-22",
            gender: "男性"
        },
        sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
        sourceSize: 1234
    });

    assert.strictEqual(result.status, "filled");
});

test("trust denial prevents resident profile fill", async () => {
    let called = false;

    const service = createService({
        trustResult: { status: "denied" },
        onFill() {
            called = true;
        }
    });

    assert.deepStrictEqual(
        await service.fill(request()),
        {
            status: "denied",
            errorCode: "connector_trust_denied"
        }
    );

    assert.strictEqual(called, false);
});

test("invalid exact-snapshot request prevents repository call", async () => {
    let called = false;

    const service = createService({
        onFill() {
            called = true;
        }
    });

    assert.deepStrictEqual(
        await service.fill({
            ...request(),
            sourceSize: -1
        }),
        {
            status: "invalid",
            errorCode: "resident_profile_invalid"
        }
    );

    assert.strictEqual(called, false);
});

test("rejects unsafe resident profile before repository", async () => {
    let called = false;

    const service = createService({
        onFill() {
            called = true;
        }
    });

    const input = request();
    input.residentProfile.active = "false";

    assert.deepStrictEqual(
        await service.fill(input),
        {
            status: "invalid",
            errorCode: "resident_profile_invalid"
        }
    );

    assert.strictEqual(called, false);
});

test("rejects profile name mismatch before repository", async () => {
    let called = false;

    const service = createService({
        onFill() {
            called = true;
        }
    });

    const input = request();
    input.residentProfile.name = "Different Resident";

    assert.deepStrictEqual(
        await service.fill(input),
        {
            status: "invalid",
            errorCode: "resident_profile_invalid"
        }
    );

    assert.strictEqual(called, false);
});

test("rejects ambiguous and impossible birth dates before repository", async () => {
    for (const birthDate of [
        "2/22/77",
        "1977-2-22",
        "2026-02-30"
    ]) {
        let called = false;

        const service = createService({
            onFill() {
                called = true;
            }
        });

        const input = request();
        input.residentProfile.birth_date = birthDate;

        assert.deepStrictEqual(
            await service.fill(input),
            {
                status: "invalid",
                errorCode: "resident_profile_invalid"
            }
        );

        assert.strictEqual(called, false);
    }
});

test("preserves repository profile status", async () => {
    for (const status of [
        "filled",
        "unchanged",
        "conflict",
        "user_code_conflict",
        "stale",
        "not_confirmed"
    ]) {
        const result = await createService({
            repositoryResult: {
                status,
                residentId:
                    ["filled", "unchanged", "conflict", "user_code_conflict"]
                        .includes(status)
                        ? "resident-1"
                        : null
            }
        }).fill(request());

        assert.strictEqual(result.status, status);
    }
});

test("repository failure is contained", async () => {
    const service = new Service({
        connectorTrustService: {
            async authenticate() {
                return {
                    status: "verified",
                    verifiedContext: {
                        facilityId: "verified-facility",
                        connectorId: "verified-connector"
                    }
                };
            }
        },
        repository: {
            async fill() {
                throw new Error("unavailable");
            }
        }
    });

    assert.deepStrictEqual(
        await service.fill(request()),
        {
            status: "error",
            errorCode: "resident_profile_unavailable"
        }
    );
});
