"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createHash
} = require("node:crypto");

const LogicalSourceSemanticPersistenceService =
    require(
        "./LogicalSourceSemanticPersistenceService"
    );

function validSemanticRecord() {
    const semanticContent = {
        "user.birth_date":
            "1980-04-12"
    };

    return {
        sourceId:
            "source-1",
        sourceRecordKey:
            "a".repeat(64),
        residentId:
            "11111111-1111-4111-8111-111111111111",
        semanticType:
            "resident_profile",
        logicalSlot:
            "primary",
        sourceRevision:
            "b".repeat(64),
        expectedContentHash:
            null,
        contentHash:
            createHash("sha256")
                .update(
                    JSON.stringify(
                        semanticContent
                    ),
                    "utf8"
                )
                .digest("hex"),
        canonicalizationVersion:
            "risen-resident-profile-canonicalization-1",
        semanticContent
    };
}

test(
    "verified connector and valid semantic integrity reach repository",
    async () => {
        let received = null;

        const service =
            new LogicalSourceSemanticPersistenceService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-1",
                                connectorId:
                                    "connector-1"
                            }
                        };
                    }
                },

                repository: {
                    async save(input) {
                        received =
                            input;

                        return {
                            status:
                                "created",
                            recordId:
                                "22222222-2222-4222-8222-222222222222"
                        };
                    }
                }
            });

        const result =
            await service.persist({
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                semanticRecord:
                    validSemanticRecord()
            });

        assert.equal(
            result.status,
            "created"
        );

        assert.equal(
            received.verifiedFacilityId,
            "facility-1"
        );

        assert.deepEqual(
            received.semanticContent,
            {
                "user.birth_date":
                    "1980-04-12"
            }
        );
    }
);

test(
    "tampered semantic hash fails closed before repository",
    async () => {
        let repositoryCalled =
            false;

        const service =
            new LogicalSourceSemanticPersistenceService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-1",
                                connectorId:
                                    "connector-1"
                            }
                        };
                    }
                },

                repository: {
                    async save() {
                        repositoryCalled =
                            true;

                        return {
                            status:
                                "created"
                        };
                    }
                }
            });

        const semanticRecord =
            validSemanticRecord();

        semanticRecord.contentHash =
            "f".repeat(64);

        const result =
            await service.persist({
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                semanticRecord
            });

        assert.deepEqual(
            result,
            {
                status:
                    "invalid",
                errorCode:
                    "logical_source_semantic_record_invalid"
            }
        );

        assert.equal(
            repositoryCalled,
            false
        );
    }
);


test(
    "impossible calendar birth date fails closed before repository",
    async () => {
        let repositoryCalled =
            false;

        const service =
            new LogicalSourceSemanticPersistenceService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-1",
                                connectorId:
                                    "connector-1"
                            }
                        };
                    }
                },

                repository: {
                    async save() {
                        repositoryCalled =
                            true;

                        return {
                            status:
                                "created"
                        };
                    }
                }
            });

        const semanticRecord =
            validSemanticRecord();

        semanticRecord.semanticContent[
            "user.birth_date"
        ] = "2026-02-31";

        semanticRecord.contentHash =
            createHash("sha256")
                .update(
                    JSON.stringify(
                        semanticRecord
                            .semanticContent
                    ),
                    "utf8"
                )
                .digest("hex");

        const result =
            await service.persist({
                connectorId:
                    "connector-1",
                credential:
                    "secret",
                semanticRecord
            });

        assert.equal(
            result.status,
            "invalid"
        );

        assert.equal(
            repositoryCalled,
            false
        );
    }
);
