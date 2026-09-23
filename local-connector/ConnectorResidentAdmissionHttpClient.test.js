"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Client = require("./ConnectorResidentAdmissionHttpClient");

const digest = "d".repeat(64);

function contract() {
    return {
        sourceDocumentKey: "source.xlsx",
        identifierType: "name",
        identifierDigest: digest,
        name: "Test Resident",
        residentProfile: {
            name: "Test Resident",
            birth_date: "2/22/77",
            gender: "男性"
        },
        sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
        sourceSize: 1234
    };
}

function response(status, body) {
    return {
        status,
        async json() { return body; }
    };
}

test("sends exact admission contract with trusted connector header", async () => {
    let request;
    const client = new Client({
        endpoint: "http://127.0.0.1/admission",
        connectorId: "connector-1",
        credential: "secret",
        fetchImpl: async (url, options) => {
            request = { url, options };
            return response(200, {
                status: "created",
                residentId: "resident-1",
                residentCreated: true
            });
        }
    });

    const result = await client.admit(contract());

    assert.strictEqual(result.status, "created");
    assert.strictEqual(request.options.method, "POST");
    assert.strictEqual(
        request.options.headers["x-risen-connector-id"],
        "connector-1"
    );
    assert.strictEqual(
        request.options.headers.Authorization,
        "RISEN-Connector secret"
    );
    assert.deepStrictEqual(
        JSON.parse(request.options.body),
        contract()
    );
    assert.strictEqual(
        JSON.parse(request.options.body).facilityId,
        undefined
    );
});

test("preserves created and existing results", async () => {
    for (const status of ["created", "existing"]) {
        const client = new Client({
            endpoint: "http://127.0.0.1/admission",
            connectorId: "connector-1",
            credential: "secret",
            fetchImpl: async () => response(200, {
                status,
                residentId: "resident-1",
                residentCreated: status === "created"
            })
        });

        const result = await client.admit(contract());
        assert.strictEqual(result.status, status);
        assert.strictEqual(result.residentId, "resident-1");
        assert.strictEqual(
            result.residentCreated,
            status === "created"
        );
    }
});

test("preserves all non-writing conflict statuses", async () => {
    for (const status of [
        "stale",
        "not_approved",
        "conflict",
        "name_conflict"
    ]) {
        const client = new Client({
            endpoint: "http://127.0.0.1/admission",
            connectorId: "connector-1",
            credential: "secret",
            fetchImpl: async () => response(409, {
                status,
                residentId: null,
                residentCreated: false
            })
        });

        const result = await client.admit(contract());
        assert.strictEqual(result.status, status);
        assert.strictEqual(result.residentCreated, false);
    }
});

test("rejects body scope injection before fetch", async () => {
    let called = false;
    const client = new Client({
        endpoint: "http://127.0.0.1/admission",
        connectorId: "connector-1",
        credential: "secret",
        fetchImpl: async () => {
            called = true;
            return response(200, {});
        }
    });

    await assert.rejects(
        () => client.admit({
            ...contract(),
            facilityId: "facility-evil"
        }),
        error => error.code === "resident_admission_invalid"
    );
    assert.strictEqual(called, false);
});

test("maps trust invalid and unavailable responses safely", async () => {
    const cases = [
        [401, "connector_trust_denied"],
        [422, "resident_admission_invalid"],
        [503, "resident_admission_unavailable"]
    ];

    for (const [status, code] of cases) {
        const client = new Client({
            endpoint: "http://127.0.0.1/admission",
            connectorId: "connector-1",
            credential: "secret",
            fetchImpl: async () => response(status, {
                errorCode: code
            })
        });

        await assert.rejects(
            () => client.admit(contract()),
            error => error.code === code
        );
    }
});


test("rejects unknown resident profile fields before fetch", async () => {
    let fetchCalled = false;

    const client = new Client({
        endpoint: "http://127.0.0.1/admission",
        connectorId: "connector-1",
        credential: "secret",
        fetchImpl: async () => {
            fetchCalled = true;
            return response(200, {});
        }
    });

    const input = contract();
    input.residentProfile = {
        ...input.residentProfile,
        active: "false"
    };

    await assert.rejects(
        () => client.admit(input),
        error =>
            error &&
            error.code === "resident_admission_invalid"
    );

    assert.strictEqual(fetchCalled, false);
});
