"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./SourceResidentMappingQueryService");

function createValidInput() {
    return {
        connectorId:
            "transport-connector",
        credential:
            "secret",
        sourceDocumentKey:
            "document-1",
        sourceUpdatedAt:
            "2026-09-15T02:30:00.000Z",
        sourceSize:
            9520
    };
}

test("queries resident links only with verified connector scope", async () => {
    let authenticatedInput = null;
    let repositoryInput = null;

    const service =
        new Service({
            connectorTrustService: {
                async authenticate(input) {
                    authenticatedInput =
                        input;

                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "verified-facility",
                            connectorId:
                                "verified-connector"
                        }
                    };
                }
            },
            sourceResidentMappingQueryRepository: {
                async list(input) {
                    repositoryInput =
                        input;

                    return {
                        status: "found",
                        mappings: []
                    };
                }
            }
        });

    const result =
        await service.list({
            ...createValidInput(),
            facilityId:
                "attacker-facility"
        });

    assert.deepStrictEqual(
        authenticatedInput,
        {
            connectorId:
                "transport-connector",
            credential:
                "secret"
        }
    );

    assert.deepStrictEqual(
        repositoryInput,
        {
            verifiedFacilityId:
                "verified-facility",
            verifiedConnectorId:
                "verified-connector",
            sourceDocumentKey:
                "document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        }
    );

    assert.deepStrictEqual(
        result,
        {
            status: "found",
            mappings: []
        }
    );
});

test("trust denial stops resident link query", async () => {
    let repositoryCalled = false;

    const service =
        new Service({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status: "denied"
                    };
                }
            },
            sourceResidentMappingQueryRepository: {
                async list() {
                    repositoryCalled =
                        true;

                    return {
                        status: "found",
                        mappings: []
                    };
                }
            }
        });

    const result =
        await service.list(
            createValidInput()
        );

    assert.deepStrictEqual(
        result,
        {
            status: "denied",
            errorCode:
                "connector_trust_denied"
        }
    );

    assert.strictEqual(
        repositoryCalled,
        false
    );
});

test("invalid snapshot stops resident link query", async () => {
    const invalidInputs = [
        {
            ...createValidInput(),
            sourceUpdatedAt:
                "not-a-date"
        },
        {
            ...createValidInput(),
            sourceSize:
                -1
        },
        {
            ...createValidInput(),
            sourceDocumentKey:
                ""
        }
    ];

    for (const input of invalidInputs) {
        let repositoryCalled = false;

        const service =
            new Service({
                connectorTrustService: {
                    async authenticate() {
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
                sourceResidentMappingQueryRepository: {
                    async list() {
                        repositoryCalled =
                            true;

                        return {
                            status: "found",
                            mappings: []
                        };
                    }
                }
            });

        const result =
            await service.list(input);

        assert.deepStrictEqual(
            result,
            {
                status: "invalid",
                errorCode:
                    "source_resident_mapping_query_invalid"
            }
        );

        assert.strictEqual(
            repositoryCalled,
            false
        );
    }
});

test("maps repository failure to unavailable without leaking details", async () => {
    const service =
        new Service({
            connectorTrustService: {
                async authenticate() {
                    return {
                        status: "verified",
                        verifiedContext: {
                            facilityId:
                                "verified-facility",
                            connectorId:
                                "verified-connector"
                        }
                    };
                }
            },
            sourceResidentMappingQueryRepository: {
                async list() {
                    throw new Error(
                        "database internal detail"
                    );
                }
            }
        });

    const result =
        await service.list(
            createValidInput()
        );

    assert.deepStrictEqual(
        result,
        {
            status: "error",
            errorCode:
                "source_resident_mapping_query_unavailable"
        }
    );
});
