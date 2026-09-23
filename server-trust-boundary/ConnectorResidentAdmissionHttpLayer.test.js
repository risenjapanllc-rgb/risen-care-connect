"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Adapter = require("./ConnectorResidentAdmissionHttpAdapter");
const Transport = require("./ConnectorResidentAdmissionTransport");

const digest = "c".repeat(64);

function validBody() {
    return {
        sourceDocumentKey: "source.xlsx",
        identifierType: "name",
        identifierDigest: digest,
        name: "Test Resident",
        sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
        sourceSize: 1234
    };
}

function createLayer({ serviceResult, onAdmit = () => {} } = {}) {
    const adapter = new Adapter({
        service: {
            async admit(input) {
                onAdmit(input);
                return serviceResult || {
                    status: "created",
                    residentId: "resident-1",
                    residentCreated: true
                };
            }
        }
    });

    return new Transport({
        httpAdapter: adapter,
        credentialTransport: {
            extract(value) {
                return value === "Bearer secret" ? "secret" : null;
            }
        }
    });
}

function request(transport, body = validBody()) {
    return transport.handle({
        method: "POST",
        contentType: "application/json",
        headers: {
            "x-risen-connector-id": "connector-1",
            authorization: "Bearer secret"
        },
        body
    });
}

test("passes connector identity only from trusted transport headers", async () => {
    let serviceInput;
    const transport = createLayer({
        onAdmit(input) { serviceInput = input; }
    });

    const result = await request(transport);

    assert.strictEqual(result.httpStatus, 200);
    assert.strictEqual(serviceInput.connectorId, "connector-1");
    assert.strictEqual(serviceInput.credential, "secret");
    assert.strictEqual(serviceInput.facilityId, undefined);
});

test("rejects extra facility or connector scope in body", async () => {
    let called = false;
    const transport = createLayer({
        onAdmit() { called = true; }
    });

    for (const extra of [
        { facilityId: "facility-evil" },
        { connectorId: "connector-evil" }
    ]) {
        const result = await request(transport, {
            ...validBody(),
            ...extra
        });
        assert.strictEqual(result.httpStatus, 422);
    }

    assert.strictEqual(called, false);
});

test("rejects unauthenticated malformed body at trust boundary before body validation", async () => {
    let called = false;

    const transport = createLayer({
        onAdmit() {
            called = true;
        }
    });

    const result =
        await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers: {},
            body: {}
        });

    assert.strictEqual(
        result.httpStatus,
        401
    );
    assert.strictEqual(
        result.body.errorCode,
        "connector_trust_denied"
    );
    assert.strictEqual(
        called,
        false
    );
});

test("requires connector header and credential", async () => {
    const transport = createLayer();

    for (const headers of [
        { authorization: "Bearer secret" },
        { "x-risen-connector-id": "connector-1" }
    ]) {
        const result = await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers,
            body: validBody()
        });
        assert.strictEqual(result.httpStatus, 401);
        assert.strictEqual(result.body.errorCode, "connector_trust_denied");
    }
});

test("maps successful admission statuses to 200", async () => {
    for (const status of ["created", "existing"]) {
        const result = await request(createLayer({
            serviceResult: {
                status,
                residentId: "resident-1",
                residentCreated: status === "created"
            }
        }));

        assert.strictEqual(result.httpStatus, 200);
        assert.strictEqual(result.body.status, status);
        assert.strictEqual(result.body.residentId, "resident-1");
    }
});

test("maps non-writing admission outcomes to 409", async () => {
    for (const status of [
        "stale", "not_approved", "conflict", "name_conflict"
    ]) {
        const result = await request(createLayer({
            serviceResult: {
                status,
                residentId: null,
                residentCreated: false
            }
        }));

        assert.strictEqual(result.httpStatus, 409);
        assert.strictEqual(result.body.status, status);
        assert.strictEqual(result.body.residentCreated, false);
    }
});

test("maps invalid, denied and unavailable distinctly", async () => {
    const cases = [
        [{ status: "invalid" }, 422],
        [{ status: "denied" }, 401],
        [{ status: "error" }, 503]
    ];

    for (const [serviceResult, expectedStatus] of cases) {
        const result = await request(createLayer({ serviceResult }));
        assert.strictEqual(result.httpStatus, expectedStatus);
    }
});

test("rejects malformed method media type and body before service", async () => {
    let called = false;
    const transport = createLayer({
        onAdmit() { called = true; }
    });

    const wrongMethod = await transport.handle({
        method: "GET",
        contentType: "application/json",
        headers: {},
        body: validBody()
    });
    assert.strictEqual(wrongMethod.httpStatus, 405);

    const wrongMedia = await transport.handle({
        method: "POST",
        contentType: "text/plain",
        headers: {},
        body: validBody()
    });
    assert.strictEqual(wrongMedia.httpStatus, 415);

    const wrongBody = await request(transport, { name: "only-name" });
    assert.strictEqual(wrongBody.httpStatus, 422);
    assert.strictEqual(called, false);
});
