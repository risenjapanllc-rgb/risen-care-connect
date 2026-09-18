"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Transport =
    require("./ResidentCreationTransport");

function createTransport({
    onHandle = () => {}
} = {}) {
    return new Transport({
        httpAdapter: {
            async handle(input) {
                onHandle(input);

                return {
                    statusCode: 200,
                    body: {
                        status: "created",
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
                };
            }
        },
        credentialTransport: {
            extract(value) {
                return value ===
                    "Bearer secret"
                    ? "secret"
                    : null;
            }
        }
    });
}

test("accepts only resident name and authenticated connector context", async () => {
    let adapterInput = null;

    const response =
        await createTransport({
            onHandle(input) {
                adapterInput = input;
            }
        }).handle({
            method: "POST",
            contentType:
                "application/json",
            headers: {
                authorization:
                    "Bearer secret",
                "x-risen-connector-id":
                    "connector-1"
            },
            body: {
                resident: {
                    name:
                        " Test Resident "
                }
            }
        });

    assert.strictEqual(
        response.httpStatus,
        200
    );

    assert.strictEqual(
        adapterInput.connectorId,
        "connector-1"
    );

    assert.strictEqual(
        adapterInput.credential,
        "secret"
    );

    assert.deepStrictEqual(
        adapterInput.resident,
        {
            name:
                "Test Resident"
        }
    );
});

test("rejects client-controlled scope and blank names", async () => {
    for (const resident of [
        {
            name:
                "Test Resident",
            facilityId:
                "must-not-pass"
        },
        {
            name:
                "Test Resident",
            connectorId:
                "must-not-pass"
        },
        {
            name: " "
        }
    ]) {
        let called = false;

        const response =
            await createTransport({
                onHandle() {
                    called = true;
                }
            }).handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {
                    authorization:
                        "Bearer secret",
                    "x-risen-connector-id":
                        "connector-1"
                },
                body: {
                    resident
                }
            });

        assert.strictEqual(
            response.httpStatus,
            422
        );

        assert.strictEqual(
            called,
            false
        );
    }
});

test("requires connector id and credential", async () => {
    for (const headers of [
        {
            authorization:
                "Bearer secret"
        },
        {
            "x-risen-connector-id":
                "connector-1"
        }
    ]) {
        const response =
            await createTransport()
                .handle({
                    method: "POST",
                    contentType:
                        "application/json",
                    headers,
                    body: {
                        resident: {
                            name:
                                "Test Resident"
                        }
                    }
                });

        assert.strictEqual(
            response.httpStatus,
            401
        );
    }
});
