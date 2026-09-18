"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorResidentCandidateService =
    require("./ConnectorResidentCandidateService");

test("uses only verified facility and connector context for candidate lookup", async () => {
    let repositoryInput = null;

    const service =
        new ConnectorResidentCandidateService({
            connectorTrustService: {
                async authenticate(input) {
                    assert.deepStrictEqual(
                        input,
                        {
                            connectorId:
                                "presented-connector",
                            credential:
                                "credential"
                        }
                    );

                    return {
                        status:
                            "verified",
                        verifiedContext: {
                            facilityId:
                                "verified-facility",
                            connectorId:
                                "verified-connector"
                        }
                    };
                }
            },

            residentCandidateRepository: {
                async getCandidates(input) {
                    repositoryInput = input;

                    return [
                        {
                            residentId:
                                "resident-1",
                            userCode:
                                "U001"
                        }
                    ];
                }
            }
        });

    const result =
        await service.findCandidates({
            connectorId:
                "presented-connector",
            credential:
                "credential",
            userCode:
                " U001 "
        });

    assert.deepStrictEqual(
        repositoryInput,
        {
            verifiedFacilityId:
                "verified-facility",
            verifiedConnectorId:
                "verified-connector",
            userCode:
                "U001",
            name:
                null
        }
    );

    assert.deepStrictEqual(
        result,
        {
            status:
                "ok",
            candidates: [
                {
                    residentId:
                        "resident-1",
                    userCode:
                        "U001"
                }
            ]
        }
    );
});

test("does not query repository when connector trust is denied", async () => {
    let repositoryCalled = false;

    const service =
        new ConnectorResidentCandidateService({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status:
                            "denied"
                    };
                }
            },

            residentCandidateRepository: {
                async getCandidates() {
                    repositoryCalled = true;
                    return [];
                }
            }
        });

    const result =
        await service.findCandidates({
            connectorId:
                "connector",
            credential:
                "credential",
            userCode:
                "U001"
        });

    assert.deepStrictEqual(
        result,
        {
            status:
                "denied",
            errorCode:
                "connector_trust_denied"
        }
    );

    assert.strictEqual(
        repositoryCalled,
        false
    );
});

test("rejects empty user code after trust verification without querying repository", async () => {
    let repositoryCalled = false;

    const service =
        new ConnectorResidentCandidateService({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status:
                            "verified",
                        verifiedContext: {
                            facilityId:
                                "facility",
                            connectorId:
                                "connector"
                        }
                    };
                }
            },

            residentCandidateRepository: {
                async getCandidates() {
                    repositoryCalled = true;
                    return [];
                }
            }
        });

    const result =
        await service.findCandidates({
            connectorId:
                "connector",
            credential:
                "credential",
            userCode:
                " "
        });

    assert.deepStrictEqual(
        result,
        {
            status:
                "invalid",
            errorCode:
                "resident_identifier_required"
        }
    );

    assert.strictEqual(
        repositoryCalled,
        false
    );
});
