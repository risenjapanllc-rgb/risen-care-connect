"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorResidentCandidateTransport =
    require("./ConnectorResidentCandidateTransport");

function createTransport({
    adapterHandle
} = {}) {
    return new ConnectorResidentCandidateTransport({
        httpAdapter: {
            async handle(input) {
                return adapterHandle(input);
            }
        },
        credentialTransport: {
            extract(value) {
                if (value === "Bearer valid") {
                    return "credential";
                }

                return null;
            }
        }
    });
}

test("passes only connector trust inputs and user code to the adapter", async () => {
    let adapterInput = null;

    const transport =
        createTransport({
            adapterHandle(input) {
                adapterInput = input;

                return {
                    statusCode: 200,
                    body: {
                        status: "ok",
                        candidates: []
                    }
                };
            }
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers: {
                "X-Risen-Connector-Id":
                    " connector-1 ",
                authorization:
                    "Bearer valid"
            },
            body: {
                userCode:
                    " U001 "
            }
        });

    assert.strictEqual(
        result.httpStatus,
        200
    );

    assert.strictEqual(
        adapterInput.connectorId,
        "connector-1"
    );

    assert.strictEqual(
        adapterInput.credential,
        "credential"
    );

    assert.strictEqual(
        adapterInput.userCode,
        "U001"
    );

    assert.deepStrictEqual(
        Object.keys(adapterInput).sort(),
        [
            "connectorId",
            "credential",
            "name",
            "requestId",
            "userCode"
        ]
    );
});

test("passes confirmed resident name query to the adapter", async () => {
    let adapterInput = null;

    const transport =
        createTransport({
            adapterHandle(input) {
                adapterInput = input;

                return {
                    statusCode: 200,
                    body: {
                        status: "ok",
                        candidates: []
                    }
                };
            }
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-1",
                authorization:
                    "Bearer valid"
            },
            body: {
                name:
                    " Test Resident "
            }
        });

    assert.strictEqual(
        result.httpStatus,
        200
    );

    assert.strictEqual(
        adapterInput.name,
        "Test Resident"
    );

    assert.strictEqual(
        adapterInput.userCode,
        null
    );
});

test("rejects facility or connector scope supplied in the JSON body", async () => {
    let adapterCalled = false;

    const transport =
        createTransport({
            adapterHandle() {
                adapterCalled = true;

                return {
                    statusCode: 200,
                    body: {}
                };
            }
        });

    const result =
        await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-1",
                authorization:
                    "Bearer valid"
            },
            body: {
                userCode: "U001",
                facilityId:
                    "untrusted-facility"
            }
        });

    assert.strictEqual(
        result.httpStatus,
        422
    );

    assert.strictEqual(
        result.body.errorCode,
        "resident_candidate_query_invalid"
    );

    assert.strictEqual(
        adapterCalled,
        false
    );
});

test("requires POST JSON, connector identity, credential, and user code", async () => {
    const transport =
        createTransport({
            adapterHandle() {
                throw new Error(
                    "adapter must not be called"
                );
            }
        });

    const wrongMethod =
        await transport.handle({
            method: "GET"
        });

    const wrongType =
        await transport.handle({
            method: "POST",
            contentType: "text/plain"
        });

    const missingUserCode =
        await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-1",
                authorization:
                    "Bearer valid"
            },
            body: {
                userCode: " "
            }
        });

    const missingConnector =
        await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers: {
                authorization:
                    "Bearer valid"
            },
            body: {
                userCode: "U001"
            }
        });

    const missingCredential =
        await transport.handle({
            method: "POST",
            contentType: "application/json",
            headers: {
                "x-risen-connector-id":
                    "connector-1"
            },
            body: {
                userCode: "U001"
            }
        });

    assert.strictEqual(
        wrongMethod.httpStatus,
        405
    );

    assert.strictEqual(
        wrongType.httpStatus,
        415
    );

    assert.strictEqual(
        missingUserCode.httpStatus,
        422
    );

    assert.strictEqual(
        missingConnector.httpStatus,
        401
    );

    assert.strictEqual(
        missingCredential.httpStatus,
        401
    );
});
