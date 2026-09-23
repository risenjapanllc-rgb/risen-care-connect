"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorResidentProfileQueryHttpClient =
    require("./ConnectorResidentProfileQueryHttpClient");

const digest = "a".repeat(64);

function input() {
    return {
        sourceDocumentKey: "recipient/test.csv",
        identifierType: "name",
        identifierDigest: digest,
        sourceUpdatedAt: "2026-09-23T10:00:00.000Z",
        sourceSize: 1234
    };
}

function response({
    ok = true,
    status = 200,
    body
}) {
    return {
        ok,
        status,
        async json() {
            return body;
        }
    };
}

function createClient(fetchImpl) {
    return new ConnectorResidentProfileQueryHttpClient({
        endpoint:
            "http://127.0.0.1:8787/connector/resident-profile-query",
        connectorId: "connector-1",
        credential: "secret-credential",
        fetchImpl
    });
}

test("queries profile using only source identity in body", async () => {
    let captured;

    const client = createClient(
        async (url, options) => {
            captured = { url, options };

            return response({
                body: {
                    status: "found",
                    profile: {
                        residentId: "resident-1",
                        name: "鈴木 大輔",
                        birth_date: null,
                        gender: "男性",
                        user_code: null
                    }
                }
            });
        }
    );

    const result = await client.get(input());

    assert.deepEqual(result, {
        status: "found",
        profile: {
            residentId: "resident-1",
            name: "鈴木 大輔",
            birth_date: null,
            gender: "男性",
            user_code: null
        }
    });

    assert.equal(
        captured.url,
        "http://127.0.0.1:8787/connector/resident-profile-query"
    );
    assert.equal(captured.options.method, "POST");
    assert.equal(
        captured.options.headers["content-type"],
        "application/json"
    );
    assert.equal(
        captured.options.headers.authorization,
        "RISEN-Connector secret-credential"
    );
    assert.equal(
        captured.options.headers["x-risen-connector-id"],
        "connector-1"
    );

    assert.deepEqual(
        JSON.parse(captured.options.body),
        input()
    );

    assert.equal(
        "facilityId" in JSON.parse(captured.options.body),
        false
    );
    assert.equal(
        "residentId" in JSON.parse(captured.options.body),
        false
    );
});

test("preserves unavailable without creating empty profile", async () => {
    const client = createClient(
        async () =>
            response({
                body: {
                    status: "unavailable"
                }
            })
    );

    assert.deepEqual(
        await client.get(input()),
        { status: "unavailable" }
    );
});

test("preserves denied response", async () => {
    const client = createClient(
        async () =>
            response({
                ok: false,
                status: 401,
                body: {
                    status: "denied",
                    errorCode:
                        "connector_trust_denied"
                }
            })
    );

    assert.deepEqual(
        await client.get(input()),
        { status: "denied" }
    );
});

test("preserves invalid response", async () => {
    const client = createClient(
        async () =>
            response({
                ok: false,
                status: 422,
                body: {
                    status: "invalid",
                    errorCode:
                        "resident_profile_query_invalid"
                }
            })
    );

    assert.deepEqual(
        await client.get(input()),
        { status: "invalid" }
    );
});

test("rejects invalid source identity before fetch", async () => {
    let called = false;

    const client = createClient(
        async () => {
            called = true;
            throw new Error("must not fetch");
        }
    );

    assert.deepEqual(
        await client.get({
            ...input(),
            identifierDigest: "invalid"
        }),
        { status: "invalid" }
    );

    assert.equal(called, false);
});

test("fails closed on HTTP error", async () => {
    const client = createClient(
        async () =>
            response({
                ok: false,
                status: 503,
                body: {
                    status: "error"
                }
            })
    );

    assert.deepEqual(
        await client.get(input()),
        { status: "error" }
    );
});

test("fails closed on malformed found response", async () => {
    const client = createClient(
        async () =>
            response({
                body: {
                    status: "found",
                    profile: {}
                }
            })
    );

    assert.deepEqual(
        await client.get(input()),
        { status: "error" }
    );
});

test("fails closed when response is not JSON", async () => {
    const client = createClient(
        async () => ({
            ok: true,
            status: 200,
            async json() {
                throw new Error("invalid json");
            }
        })
    );

    assert.deepEqual(
        await client.get(input()),
        { status: "error" }
    );
});

test("fails closed on transport failure", async () => {
    const client = createClient(
        async () => {
            throw new Error("network unavailable");
        }
    );

    assert.deepEqual(
        await client.get(input()),
        { status: "error" }
    );
});
