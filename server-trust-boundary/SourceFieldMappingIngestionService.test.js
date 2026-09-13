"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceFieldMappingIngestionService =
    require("./SourceFieldMappingIngestionService");

function createValidMapping() {
    return {
        sourceDocumentKey:
            "document-1",
        sourceFieldKey:
            "sheet:0:column:3",
        standardEntityName:
            "user",
        standardFieldName:
            "blood_type",
        sheetName:
            "Sheet1",
        headerLabel:
            "血液型"
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
    validationResult = {
        status: "valid",
        validatedSourceFieldMapping:
            createValidMapping()
    },
    persistenceResult = {
        status: "created"
    },
    clock = () =>
        new Date(
            "2026-09-12T01:00:00.000Z"
        ),
    onPersist = () => {}
} = {}) {
    return new SourceFieldMappingIngestionService({
        connectorTrustService: {
            async authenticate() {
                return trustResult;
            }
        },

        sourceFieldMappingPayloadValidator: {
            validate() {
                return validationResult;
            }
        },

        sourceFieldMappingPersistenceRepository: {
            async upsert(input) {
                onPersist(input);
                return persistenceResult;
            }
        },

        clock
    });
}

test(
    "persists confirmed mapping with verified connector context and server time",
    async () => {
        let persistedInput;

        const service =
            createService({
                onPersist(input) {
                    persistedInput =
                        input;
                }
            });

        const result =
            await service.ingest({
                connectorId:
                    "client-connector",
                credential:
                    "secret",
                sourceFieldMapping: {
                    ...createValidMapping(),

                    facilityId:
                        "client-facility",

                    connectorId:
                        "client-override",

                    confirmedAt:
                        "2000-01-01T00:00:00.000Z"
                }
            });

        assert.deepEqual(
            result,
            {
                status: "created"
            }
        );

        assert.deepEqual(
            persistedInput,
            {
                verifiedFacilityId:
                    "verified-facility",
                verifiedConnectorId:
                    "verified-connector",
                sourceDocumentKey:
                    "document-1",
                sourceFieldKey:
                    "sheet:0:column:3",
                standardEntityName:
                    "user",
                standardFieldName:
                    "blood_type",
                sheetName:
                    "Sheet1",
                headerLabel:
                    "血液型",
                confirmedAt:
                    "2026-09-12T01:00:00.000Z"
            }
        );
    }
);

test(
    "trust denial stops validation and persistence",
    async () => {
        let validated = false;
        let persisted = false;

        const service =
            new SourceFieldMappingIngestionService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status: "denied"
                        };
                    }
                },

                sourceFieldMappingPayloadValidator: {
                    validate() {
                        validated = true;
                        return {
                            status: "valid"
                        };
                    }
                },

                sourceFieldMappingPersistenceRepository: {
                    async upsert() {
                        persisted = true;
                        return {
                            status: "created"
                        };
                    }
                }
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector",
                credential:
                    "credential",
                sourceFieldMapping:
                    createValidMapping()
            });

        assert.equal(
            result.status,
            "denied"
        );

        assert.equal(
            validated,
            false
        );

        assert.equal(
            persisted,
            false
        );
    }
);

test(
    "invalid payload stops persistence",
    async () => {
        let persisted = false;

        const service =
            createService({
                validationResult: {
                    status: "invalid",
                    errorCode:
                        "source_field_key_invalid"
                },

                onPersist() {
                    persisted = true;
                }
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector",
                credential:
                    "credential",
                sourceFieldMapping: {}
            });

        assert.deepEqual(
            result,
            {
                status: "invalid",
                errorCode:
                    "source_field_key_invalid"
            }
        );

        assert.equal(
            persisted,
            false
        );
    }
);

test(
    "does not adopt client facility connector or confirmed time",
    async () => {
        let persistedInput;

        const service =
            createService({
                onPersist(input) {
                    persistedInput =
                        input;
                }
            });

        await service.ingest({
            connectorId:
                "transport-connector",
            credential:
                "credential",
            sourceFieldMapping: {
                ...createValidMapping(),
                facilityId:
                    "evil-facility",
                connectorId:
                    "evil-connector",
                confirmedAt:
                    "1999-01-01T00:00:00.000Z"
            }
        });

        assert.equal(
            persistedInput.verifiedFacilityId,
            "verified-facility"
        );

        assert.equal(
            persistedInput.verifiedConnectorId,
            "verified-connector"
        );

        assert.equal(
            persistedInput.confirmedAt,
            "2026-09-12T01:00:00.000Z"
        );
    }
);

test(
    "maps repository lifecycle statuses",
    async () => {
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

            assert.deepEqual(
                await service.ingest({
                    connectorId:
                        "connector",
                    credential:
                        "credential",
                    sourceFieldMapping:
                        createValidMapping()
                }),
                {
                    status
                }
            );
        }
    }
);

test(
    "fails safely on invalid verified context",
    async () => {
        const service =
            createService({
                trustResult: {
                    status: "verified",
                    verifiedContext: {
                        facilityId: "",
                        connectorId:
                            "connector"
                    }
                }
            });

        assert.deepEqual(
            await service.ingest({
                connectorId:
                    "connector",
                credential:
                    "credential",
                sourceFieldMapping:
                    createValidMapping()
            }),
            {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            }
        );
    }
);

test(
    "fails safely when server clock is invalid",
    async () => {
        const service =
            createService({
                clock: () =>
                    new Date("invalid")
            });

        assert.deepEqual(
            await service.ingest({
                connectorId:
                    "connector",
                credential:
                    "credential",
                sourceFieldMapping:
                    createValidMapping()
            }),
            {
                status: "error",
                errorCode:
                    "source_field_mapping_clock_unavailable"
            }
        );
    }
);


test(
    "fails safely when validator reports valid without a mapping object",
    async () => {
        let persisted = false;

        const service =
            createService({
                validationResult: {
                    status: "valid",
                    validatedSourceFieldMapping:
                        null
                },

                onPersist() {
                    persisted = true;
                }
            });

        assert.deepEqual(
            await service.ingest({
                connectorId:
                    "connector",
                credential:
                    "credential",
                sourceFieldMapping:
                    createValidMapping()
            }),
            {
                status: "error",
                errorCode:
                    "source_field_mapping_validation_invalid_result"
            }
        );

        assert.equal(
            persisted,
            false
        );
    }
);
