"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("./ConnectorResidentAdmissionService");

const digest = "b".repeat(64);

function request() {
    return {
        connectorId: "transport-connector",
        credential: "secret",
        sourceDocumentKey: "source.xlsx",
        identifierType: "name",
        identifierDigest: digest,
        name: "Test Resident",
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
        status: "created",
        residentId: "resident-1",
        residentCreated: true
    },
    onAdmit = () => {}
} = {}) {
    return new Service({
        connectorTrustService: {
            async authenticate() { return trustResult; }
        },
        repository: {
            async admit(input) {
                onAdmit(input);
                return repositoryResult;
            }
        }
    });
}

test("uses only trust-verified facility and connector scope", async () => {
    let repositoryInput;
    const service = createService({
        onAdmit(input) { repositoryInput = input; }
    });

    const result = await service.admit({
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
        sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
        sourceSize: 1234
    });
    assert.strictEqual(result.status, "created");
});

test("trust denial prevents atomic admission", async () => {
    let called = false;
    const service = createService({
        trustResult: { status: "denied" },
        onAdmit() { called = true; }
    });

    assert.deepStrictEqual(
        await service.admit(request()),
        { status: "denied", errorCode: "connector_trust_denied" }
    );
    assert.strictEqual(called, false);
});

test("invalid exact-snapshot request prevents repository call", async () => {
    let called = false;
    const service = createService({
        onAdmit() { called = true; }
    });

    assert.deepStrictEqual(
        await service.admit({ ...request(), sourceSize: -1 }),
        { status: "invalid", errorCode: "resident_admission_invalid" }
    );
    assert.strictEqual(called, false);
});

test("preserves repository admission status", async () => {
    for (const status of [
        "created", "existing", "stale", "not_approved",
        "conflict", "name_conflict"
    ]) {
        const result = await createService({
            repositoryResult: {
                status,
                residentId:
                    ["created", "existing"].includes(status)
                        ? "resident-1"
                        : null,
                residentCreated: status === "created"
            }
        }).admit(request());

        assert.strictEqual(result.status, status);
    }
});
