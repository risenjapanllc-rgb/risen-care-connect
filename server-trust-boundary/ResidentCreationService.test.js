"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./ResidentCreationService");

function createService({
    trustResult = {
        status: "verified",
        verifiedContext: {
            facilityId:
                "verified-facility",
            connectorId:
                "verified-connector"
        }
    },
    repositoryResult = {
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
    },
    repositoryError = null,
    onCreate = () => {}
} = {}) {
    return new Service({
        connectorTrustService: {
            async authenticate() {
                return trustResult;
            }
        },
        residentCreationRepository: {
            async create(input) {
                onCreate(input);

                if (repositoryError) {
                    throw repositoryError;
                }

                return repositoryResult;
            }
        }
    });
}

test("uses only verified facility and connector scope", async () => {
    let repositoryInput = null;

    const service =
        createService({
            onCreate(input) {
                repositoryInput = input;
            }
        });

    const result =
        await service.create({
            connectorId:
                "transport-connector",
            credential:
                "secret",
            resident: {
                name:
                    " Test Resident ",
                facilityId:
                    "must-not-pass",
                connectorId:
                    "must-not-pass"
            }
        });

    assert.deepStrictEqual(
        repositoryInput,
        {
            verifiedFacilityId:
                "verified-facility",
            verifiedConnectorId:
                "verified-connector",
            name:
                "Test Resident"
        }
    );

    assert.strictEqual(
        result.status,
        "created"
    );
});

test("trust denial prevents resident creation", async () => {
    let called = false;

    const service =
        createService({
            trustResult: {
                status: "denied"
            },
            onCreate() {
                called = true;
            }
        });

    const result =
        await service.create({
            connectorId:
                "connector",
            credential:
                "secret",
            resident: {
                name:
                    "Test Resident"
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "denied",
            errorCode:
                "connector_trust_denied"
        }
    );

    assert.strictEqual(
        called,
        false
    );
});

test("blank resident name is invalid", async () => {
    let called = false;

    const service =
        createService({
            onCreate() {
                called = true;
            }
        });

    const result =
        await service.create({
            connectorId:
                "connector",
            credential:
                "secret",
            resident: {
                name: " "
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "resident_creation_invalid"
        }
    );

    assert.strictEqual(
        called,
        false
    );
});

test("repository ambiguity remains distinct from availability failure", async () => {
    const ambiguous =
        new Error("ambiguous");
    ambiguous.code =
        "resident_name_ambiguous";

    assert.deepStrictEqual(
        await createService({
            repositoryError:
                ambiguous
        }).create({
            connectorId:
                "connector",
            credential:
                "secret",
            resident: {
                name:
                    "Test Resident"
            }
        }),
        {
            status: "ambiguous",
            errorCode:
                "resident_name_ambiguous"
        }
    );

    assert.deepStrictEqual(
        await createService({
            repositoryError:
                new Error("unavailable")
        }).create({
            connectorId:
                "connector",
            credential:
                "secret",
            resident: {
                name:
                    "Test Resident"
            }
        }),
        {
            status: "error",
            errorCode:
                "resident_creation_unavailable"
        }
    );
});
