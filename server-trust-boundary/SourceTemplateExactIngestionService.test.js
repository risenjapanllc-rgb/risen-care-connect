"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceTemplateExactIngestionService =
    require("./SourceTemplateExactIngestionService");

function createService({
    trustStatus = "verified",
    persistenceStatus = "created"
} = {}) {
    return new SourceTemplateExactIngestionService({
        connectorTrustService: {
            async authenticate() {
                if (trustStatus === "denied") {
                    return {
                        status: "denied"
                    };
                }

                return {
                    status: "verified",
                    verifiedContext: {
                        facilityId:
                            "facility-1",
                        connectorId:
                            "connector-1"
                    }
                };
            }
        },

        sourceTemplateExactPayloadValidator: {
            validate(value) {
                if (!value) {
                    return {
                        status: "invalid"
                    };
                }

                return {
                    status: "valid",
                    validatedSourceTemplateExact:
                        value
                };
            }
        },

        sourceTemplateExactPersistenceRepository: {
            async getOrCreate(input) {
                assert.equal(
                    input.verifiedFacilityId,
                    "facility-1"
                );

                assert.equal(
                    input.verifiedConnectorId,
                    "connector-1"
                );

                return {
                    status:
                        persistenceStatus,
                    templateId:
                        [
                            "created",
                            "unchanged",
                            "conflict"
                        ].includes(
                            persistenceStatus
                        )
                            ? "template-1"
                            : null
                };
            }
        }
    });
}

function validPayload() {
    return {
        displayName:
            "利用者台帳",
        fileType:
            "csv",
        documentType:
            null,
        structureFingerprint:
            "a".repeat(64),
        canonicalizationVersion:
            "risen-source-template-canonicalization-1",
        canonicalStructure: {
            type: "csv",
            fields: []
        }
    };
}

test(
    "uses verified facility and connector identity",
    async () => {
        const service =
            createService();

        const result =
            await service.ingest({
                connectorId:
                    "untrusted-connector-value",
                credential:
                    "credential",
                sourceTemplateExact:
                    validPayload()
            });

        assert.deepEqual(
            result,
            {
                status:
                    "created",
                templateId:
                    "template-1"
            }
        );
    }
);

test(
    "returns conflict as semantic lifecycle result",
    async () => {
        const service =
            createService({
                persistenceStatus:
                    "conflict"
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector-1",
                credential:
                    "credential",
                sourceTemplateExact:
                    validPayload()
            });

        assert.deepEqual(
            result,
            {
                status:
                    "conflict",
                templateId:
                    "template-1"
            }
        );
    }
);

test(
    "rejects denied connector",
    async () => {
        const service =
            createService({
                trustStatus:
                    "denied"
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector-1",
                credential:
                    "credential",
                sourceTemplateExact:
                    validPayload()
            });

        assert.equal(
            result.status,
            "denied"
        );
    }
);
