"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldInterpretationIngestionService =
    require("./SourceFieldInterpretationIngestionService");

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
    }
} = {}) {
    const persistenceCalls = [];

    const service =
        new SourceFieldInterpretationIngestionService({
            connectorTrustService: {
                async authenticate() {
                    return trustResult;
                }
            },
            sourceFieldInterpretationPayloadValidator: {
                validate(value) {
                    return {
                        status: "valid",
                        validatedSourceFieldInterpretation:
                            value
                    };
                }
            },
            sourceFieldInterpretationPersistenceRepository: {
                async confirm(value) {
                    persistenceCalls.push(value);
                    return persistenceResult;
                }
            }
        });

    return {
        service,
        persistenceCalls
    };
}

test("persists using verified facility and connector context", async () => {
    const {
        service,
        persistenceCalls
    } =
        createService();

    const result =
        await service.ingest({
            connectorId:
                "request-connector",
            credential:
                "secret",
            sourceFieldInterpretation: {
                sourceDocumentKey:
                    "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
                sourceFieldKey:
                    "sheet:0:column:5",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null,
                facilityId:
                    "browser-facility",
                connectorId:
                    "browser-connector"
            }
        });

    assert.deepEqual(
        result,
        {
            status: "created"
        }
    );

    assert.equal(
        persistenceCalls.length,
        1
    );

    assert.deepEqual(
        persistenceCalls[0],
        {
            verifiedFacilityId:
                "verified-facility",
            verifiedConnectorId:
                "verified-connector",
            sourceDocumentKey:
                "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
            sourceFieldKey:
                "sheet:0:column:5",
            interpretationStatus:
                "deferred",
            mappingStatus:
                "unmapped",
            confirmedMeaning:
                null
        }
    );
});

test("does not persist when connector trust is denied", async () => {
    const {
        service,
        persistenceCalls
    } =
        createService({
            trustResult: {
                status: "denied"
            }
        });

    const result =
        await service.ingest({
            connectorId:
                "connector",
            credential:
                "secret",
            sourceFieldInterpretation: {}
        });

    assert.equal(
        result.status,
        "denied"
    );

    assert.equal(
        persistenceCalls.length,
        0
    );
});

test("maps invalid persistence result to invalid", async () => {
    const {
        service
    } =
        createService({
            persistenceResult: {
                status: "invalid"
            }
        });

    const result =
        await service.ingest({
            connectorId:
                "connector",
            credential:
                "secret",
            sourceFieldInterpretation: {
                sourceDocumentKey:
                    "source-document-1",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize:
                12345,
                sourceFieldKey:
                    "sheet:0:column:5",
                interpretationStatus:
                    "deferred",
                mappingStatus:
                    "unmapped",
                confirmedMeaning:
                    null
            }
        });

    assert.deepEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "source_field_interpretation_invalid"
        }
    );
});
