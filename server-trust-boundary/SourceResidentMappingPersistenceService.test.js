"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./SourceResidentMappingPersistenceService");

function createValidLink() {
    return {
        sourceDocumentKey:
            "document-1",
        identifierType:
            "name",
        identifierDigest:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        mappingStatus:
            "confirmed",
        residentId:
            "33333333-3333-3333-3333-333333333333",
        sourceUpdatedAt:
            "2026-09-15T02:30:00.000Z",
        sourceSize:
            9520
    };
}

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
    persistenceResult = {
        status: "created"
    },
    onAuthenticate = () => {},
    onPersist = () => {}
} = {}) {
    return new Service({
        connectorTrustService: {
            async authenticate(input) {
                onAuthenticate(input);
                return trustResult;
            }
        },
        sourceResidentMappingPersistenceRepository: {
            async save(input) {
                onPersist(input);
                return persistenceResult;
            }
        }
    });
}

test("persists only with verified connector scope", async () => {
    let authenticatedInput = null;
    let persistedInput = null;

    const service =
        createService({
            onAuthenticate(input) {
                authenticatedInput =
                    input;
            },
            onPersist(input) {
                persistedInput =
                    input;
            }
        });

    const result =
        await service.save({
            connectorId:
                "transport-connector",
            credential:
                "secret",
            sourceResidentMapping: {
                ...createValidLink(),
                facilityId:
                    "must-not-pass",
                connectorId:
                    "must-not-pass"
            }
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
        persistedInput,
        {
            verifiedFacilityId:
                "verified-facility",
            verifiedConnectorId:
                "verified-connector",
            sourceDocumentKey:
                "document-1",
            identifierType:
                "name",
            identifierDigest:
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            mappingStatus:
                "confirmed",
            residentId:
                "33333333-3333-3333-3333-333333333333",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        }
    );

    assert.deepStrictEqual(
        result,
        {
            status: "created"
        }
    );
});

test("trust denial stops resident link persistence", async () => {
    let persisted = false;

    const service =
        createService({
            trustResult: {
                status: "denied"
            },
            onPersist() {
                persisted = true;
            }
        });

    const result =
        await service.save({
            connectorId:
                "connector",
            credential:
                "credential",
            sourceResidentMapping:
                createValidLink()
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
        persisted,
        false
    );
});

test("rejects matched because candidate state is not a human-reviewed link", async () => {
    let persisted = false;

    const service =
        createService({
            onPersist() {
                persisted = true;
            }
        });

    const result =
        await service.save({
            connectorId:
                "connector",
            credential:
                "credential",
            sourceResidentMapping: {
                ...createValidLink(),
                mappingStatus:
                    "matched"
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "source_resident_mapping_invalid"
        }
    );

    assert.strictEqual(
        persisted,
        false
    );
});

test("requires residentId only for confirmed link", async () => {
    for (const sourceResidentMapping of [
        {
            ...createValidLink(),
            residentId: null
        },
        {
            ...createValidLink(),
            mappingStatus:
                "deferred",
            residentId:
                "33333333-3333-3333-3333-333333333333"
        },
        {
            ...createValidLink(),
            mappingStatus:
                "no_match",
            residentId:
                "33333333-3333-3333-3333-333333333333"
        }
    ]) {
        let persisted = false;

        const service =
            createService({
                onPersist() {
                    persisted = true;
                }
            });

        const result =
            await service.save({
                connectorId:
                    "connector",
                credential:
                    "credential",
                sourceResidentMapping
            });

        assert.strictEqual(
            result.status,
            "invalid"
        );

        assert.strictEqual(
            persisted,
            false
        );
    }
});

test("maps repository lifecycle statuses", async () => {
    for (const status of [
        "created",
        "updated",
        "unchanged"
    ]) {
        const service =
            createService({
                persistenceResult: {
                    status
                }
            });

        assert.deepStrictEqual(
            await service.save({
                connectorId:
                    "connector",
                credential:
                    "credential",
                sourceResidentMapping:
                    createValidLink()
            }),
            {
                status
            }
        );
    }
});
