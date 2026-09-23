"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Transport = require("./ConnectorResidentProfileQueryTransport");

const validBody = {
    sourceDocumentKey: "source.xlsx",
    identifierType: "name",
    identifierDigest: "a".repeat(64),
    sourceUpdatedAt: "2026-09-22T01:02:03.000Z",
    sourceSize: 1234
};

function createTransport(handle = async () => ({
    statusCode: 200,
    body: { status: "unavailable" }
})) {
    return new Transport({
        httpAdapter: { handle },
        credentialTransport: {
            extract(value) {
                return value === "Bearer valid-token"
                    ? "valid-token"
                    : null;
            }
        }
    });
}

function request(overrides = {}) {
    return {
        method: "POST",
        contentType: "application/json",
        headers: {
            "x-risen-connector-id": "connector-1",
            authorization: "Bearer valid-token"
        },
        body: validBody,
        ...overrides
    };
}

test("passes verified transport inputs to adapter", async () => {
    let received;

    const transport = createTransport(async input => {
        received = input;
        return {
            statusCode: 200,
            body: { status: "unavailable" }
        };
    });

    const result = await transport.handle(request());

    assert.equal(result.httpStatus, 200);
    assert.equal(received.connectorId, "connector-1");
    assert.equal(received.credential, "valid-token");
    assert.equal(typeof received.requestId, "string");
    assert.deepEqual(
        Object.fromEntries(
            Object.entries(received).filter(
                ([key]) => Object.hasOwn(validBody, key)
            )
        ),
        validBody
    );
});

test("rejects missing credentials before body validation", async () => {
    let called = false;

    const transport = createTransport(async () => {
        called = true;
        return { statusCode: 200, body: {} };
    });

    const result = await transport.handle(request({
        headers: {
            "x-risen-connector-id": "connector-1"
        },
        body: {}
    }));

    assert.equal(result.httpStatus, 401);
    assert.equal(called, false);
});

test("rejects facility and connector spoofing in body", async () => {
    let called = false;

    const transport = createTransport(async () => {
        called = true;
        return { statusCode: 200, body: {} };
    });

    for (const extra of [
        { facilityId: "other-facility" },
        { connectorId: "other-connector" },
        { residentId: "other-resident" }
    ]) {
        const result = await transport.handle(request({
            body: { ...validBody, ...extra }
        }));

        assert.equal(result.httpStatus, 422);
    }

    assert.equal(called, false);
});

test("rejects invalid source identity", async () => {
    const transport = createTransport();

    for (const changed of [
        { identifierDigest: "invalid" },
        { identifierType: "resident_id" },
        { sourceSize: -1 },
        { sourceUpdatedAt: "invalid" }
    ]) {
        const result = await transport.handle(request({
            body: { ...validBody, ...changed }
        }));

        assert.equal(result.httpStatus, 422);
    }
});

test("rejects unsupported method and media type", async () => {
    const transport = createTransport();

    assert.equal(
        (await transport.handle(request({
            method: "GET"
        }))).httpStatus,
        405
    );

    assert.equal(
        (await transport.handle(request({
            contentType: "text/plain"
        }))).httpStatus,
        415
    );
});

test("contains adapter exceptions", async () => {
    const transport = createTransport(async () => {
        throw new Error("sensitive internal error");
    });

    const result = await transport.handle(request());

    assert.equal(result.httpStatus, 503);
    assert.doesNotMatch(
        JSON.stringify(result),
        /sensitive internal error/
    );
});

test("rejects malformed adapter responses", async () => {
    const transport = createTransport(async () => ({
        statusCode: "200",
        body: {}
    }));

    const result = await transport.handle(request());

    assert.equal(result.httpStatus, 503);
});
