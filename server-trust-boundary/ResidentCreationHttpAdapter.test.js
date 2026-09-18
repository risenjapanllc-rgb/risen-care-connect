"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Adapter =
    require("./ResidentCreationHttpAdapter");

function createAdapter(result) {
    return new Adapter({
        residentCreationService: {
            async create() {
                return result;
            }
        }
    });
}

test("returns resident for created and existing outcomes", async () => {
    for (const status of [
        "created",
        "existing"
    ]) {
        const resident = {
            residentId:
                "resident-1",
            userCode: null,
            name:
                "Test Resident",
            kana: null,
            birthDate: null
        };

        const response =
            await createAdapter({
                status,
                resident
            }).handle({
                requestId:
                    "request-1",
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                resident: {
                    name:
                        "Test Resident"
                }
            });

        assert.deepStrictEqual(
            response,
            {
                statusCode: 200,
                body: {
                    status,
                    resident
                }
            }
        );
    }
});

test("maps invalid, denied and ambiguous outcomes safely", async () => {
    const cases = [
        [
            {
                status: "invalid"
            },
            422,
            "resident_creation_invalid"
        ],
        [
            {
                status: "denied"
            },
            401,
            "connector_trust_denied"
        ],
        [
            {
                status: "ambiguous"
            },
            409,
            "resident_name_ambiguous"
        ]
    ];

    for (
        const [result, statusCode, errorCode]
        of cases
    ) {
        const response =
            await createAdapter(result)
                .handle({
                    requestId:
                        "request-1"
                });

        assert.strictEqual(
            response.statusCode,
            statusCode
        );

        assert.strictEqual(
            response.body.errorCode,
            errorCode
        );
    }
});
