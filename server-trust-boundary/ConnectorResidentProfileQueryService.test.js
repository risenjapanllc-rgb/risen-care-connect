"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("./ConnectorResidentProfileQueryService");

const input = {
    connectorId: "untrusted-connector",
    credential: "test-credential",
    sourceDocumentKey: "source.xlsx",
    identifierType: "name",
    identifierDigest: "a".repeat(64),
    sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
    sourceSize: 1234
};

const profile = {
    residentId: "resident-1",
    name: "山田 太郎",
    birth_date: null,
    gender: "男性",
    user_code: null
};

function createService({
    authenticate = async () => ({
        status: "verified",
        verifiedContext: {
            facilityId: "verified-facility",
            connectorId: "verified-connector"
        }
    }),
    get = async () => profile
} = {}) {
    return new Service({
        connectorTrustService: { authenticate },
        repository: { get }
    });
}

test("uses only trust-verified scope", async () => {
    let received;

    const service = createService({
        get: async value => {
            received = value;
            return profile;
        }
    });

    const result = await service.get({
        ...input,
        facilityId: "untrusted-facility"
    });

    assert.equal(result.status, "found");
    assert.deepEqual(result.profile, profile);
    assert.equal(
        received.verifiedFacilityId,
        "verified-facility"
    );
    assert.equal(
        received.verifiedConnectorId,
        "verified-connector"
    );
});

test("trust denial prevents repository access", async () => {
    let called = false;

    const service = createService({
        authenticate: async () => ({ status: "denied" }),
        get: async () => {
            called = true;
            return profile;
        }
    });

    assert.deepEqual(await service.get(input), {
        status: "denied",
        errorCode: "connector_trust_denied"
    });
    assert.equal(called, false);
});

test("trust failure is distinguished from missing profile", async () => {
    const service = createService({
        authenticate: async () => {
            throw new Error("trust unavailable");
        }
    });

    assert.deepEqual(await service.get(input), {
        status: "error",
        errorCode: "connector_trust_unavailable"
    });
});

test("invalid verified context prevents repository access", async () => {
    let called = false;

    const service = createService({
        authenticate: async () => ({
            status: "verified",
            verifiedContext: {}
        }),
        get: async () => {
            called = true;
            return profile;
        }
    });

    assert.equal(
        (await service.get(input)).errorCode,
        "connector_trust_invalid_result"
    );
    assert.equal(called, false);
});

test("invalid source identity prevents repository access", async () => {
    let called = false;

    const service = createService({
        get: async () => {
            called = true;
            return profile;
        }
    });

    const result = await service.get({
        ...input,
        identifierDigest: "invalid"
    });

    assert.equal(result.status, "invalid");
    assert.equal(called, false);
});

test("missing profile is unavailable, never an empty profile", async () => {
    const service = createService({
        get: async () => null
    });

    assert.deepEqual(await service.get(input), {
        status: "unavailable"
    });
});

test("repository failure is not treated as missing profile", async () => {
    const service = createService({
        get: async () => {
            throw new Error("database unavailable");
        }
    });

    assert.deepEqual(await service.get(input), {
        status: "error",
        errorCode: "resident_profile_query_unavailable"
    });
});
