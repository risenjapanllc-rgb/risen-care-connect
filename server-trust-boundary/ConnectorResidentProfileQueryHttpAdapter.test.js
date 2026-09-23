"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Adapter = require("./ConnectorResidentProfileQueryHttpAdapter");

function adapter(result) {
    return new Adapter({
        service: {
            async get() {
                return result;
            }
        }
    });
}

test("returns confirmed resident profile", async () => {
    const profile = {
        residentId: "resident-1",
        name: "山田 太郎",
        birth_date: null,
        gender: "男性",
        user_code: null
    };

    const response = await adapter({
        status: "found",
        profile
    }).handle({ requestId: "request-1" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
        status: "found",
        profile
    });
});

test("missing profile is not represented as empty fields", async () => {
    const response = await adapter({
        status: "unavailable"
    }).handle({ requestId: "request-1" });

    assert.deepEqual(response, {
        statusCode: 200,
        body: { status: "unavailable" }
    });
});

test("rejects malformed found result", async () => {
    const response = await adapter({
        status: "found",
        profile: {}
    }).handle({ requestId: "request-1" });

    assert.equal(response.statusCode, 503);
    assert.equal(
        response.body.errorCode,
        "connector_processing_unavailable"
    );
});

test("maps denied and invalid separately", async () => {
    const denied = await adapter({
        status: "denied"
    }).handle({ requestId: "request-1" });

    const invalid = await adapter({
        status: "invalid"
    }).handle({ requestId: "request-1" });

    assert.equal(denied.statusCode, 401);
    assert.equal(invalid.statusCode, 422);
});

test("contains service exceptions", async () => {
    const instance = new Adapter({
        service: {
            async get() {
                throw new Error("sensitive internal error");
            }
        }
    });

    const response = await instance.handle({
        requestId: "request-1"
    });

    assert.equal(response.statusCode, 503);
    assert.doesNotMatch(
        JSON.stringify(response),
        /sensitive internal error/
    );
});
