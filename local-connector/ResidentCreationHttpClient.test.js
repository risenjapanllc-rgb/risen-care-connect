"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ResidentCreationHttpClient =
    require("./ResidentCreationHttpClient");

function createClient({
    responses = []
} = {}) {
    const requests = [];

    const client =
        new ResidentCreationHttpClient({
            endpoint:
                "http://127.0.0.1:8787/connector/residents",
            connectorId:
                "connector-A",
            credential:
                "test-credential",
            authorizationScheme:
                "RISEN-Connector",
            fetchImpl:
                async (url, options) => {
                    requests.push({
                        url,
                        options
                    });

                    const response =
                        responses.shift() || {
                            status: 200,
                            body: {}
                        };

                    return {
                        ok:
                            response.status >= 200 &&
                            response.status < 300,
                        status:
                            response.status,
                        async json() {
                            return response.body;
                        }
                    };
                }
        });

    return {
        client,
        requests
    };
}

test("creates resident with only the human-confirmed name", async () => {
    const {
        client,
        requests
    } = createClient({
        responses: [{
            status: 200,
            body: {
                status:
                    "created",
                resident: {
                    residentId:
                        "resident-1",
                    userCode: null,
                    name:
                        "Test Resident",
                    kana: null,
                    birthDate: null
                }
            }
        }]
    });

    const result =
        await client.create({
            name:
                " Test Resident "
        });

    assert.deepStrictEqual(
        result,
        {
            status:
                "created",
            resident: {
                residentId:
                    "resident-1",
                userCode: null,
                name:
                    "Test Resident",
                kana: null,
                birthDate: null
            }
        }
    );

    assert.strictEqual(
        requests.length,
        1
    );

    assert.deepStrictEqual(
        JSON.parse(
            requests[0].options.body
        ),
        {
            resident: {
                name:
                    "Test Resident"
            }
        }
    );

    assert.strictEqual(
        requests[0].options.headers[
            "x-risen-connector-id"
        ],
        "connector-A"
    );

    assert.strictEqual(
        requests[0].options.headers.authorization,
        "RISEN-Connector test-credential"
    );
});

test("accepts existing resident returned after human confirmation", async () => {
    const {
        client
    } = createClient({
        responses: [{
            status: 200,
            body: {
                status:
                    "existing",
                resident: {
                    residentId:
                        "resident-1",
                    userCode:
                        "U001",
                    name:
                        "Test Resident",
                    kana:
                        "テスト",
                    birthDate:
                        "2000-01-01"
                }
            }
        }]
    });

    const result =
        await client.create({
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

test("preserves safe ambiguity error without exposing database details", async () => {
    const {
        client
    } = createClient({
        responses: [{
            status: 409,
            body: {
                requestId:
                    "request-1",
                errorCode:
                    "resident_name_ambiguous",
                message:
                    "must-not-be-used"
            }
        }]
    });

    await assert.rejects(
        client.create({
            name:
                "Test Resident"
        }),
        error =>
            error?.code ===
                "resident_name_ambiguous" &&
            error?.httpStatus === 409 &&
            error?.requestId ===
                "request-1"
    );
});

test("rejects blank name before network access", async () => {
    const {
        client,
        requests
    } = createClient();

    await assert.rejects(
        client.create({
            name: " "
        }),
        TypeError
    );

    assert.strictEqual(
        requests.length,
        0
    );
});

test("rejects invalid successful response", async () => {
    const {
        client
    } = createClient({
        responses: [{
            status: 200,
            body: {
                status:
                    "created",
                resident: {
                    name:
                        "Test Resident"
                }
            }
        }]
    });

    await assert.rejects(
        client.create({
            name:
                "Test Resident"
        }),
        error =>
            error?.code ===
            "server_trust_boundary_invalid_response"
    );
});
