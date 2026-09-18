"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const LocalImportPreviewService =
    require("./LocalImportPreviewService");

const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");

const canonicalizer =
    new ConnectorSupportRecordCanonicalizer();

function canonicalHash(fields) {
    return canonicalizer.process(fields).contentHash;
}

function createService({
    entities,
    fieldMappings,
    residentMappings,
    sourceRecordIdentityMapping = {
        sourceFieldKey: "sheet:0:column:3",
        confirmedAt:
            "2026-09-17T00:00:00.000Z"
    },
    semanticRecords = null,
    semanticRecordPreviewClient = null
}) {
    return new LocalImportPreviewService({
        localConnectorService: {
            async resolveSourceSnapshot() {
                return {
                    sourceDocumentKey: "doc-1",
                    sourceUpdatedAt:
                        "2026-09-17T00:00:00.000Z",
                    sourceSize: 100,
                    analysis: {
                        extracted: {
                            sourceEntities:
                                entities
                        }
                    }
                };
            }
        },
        sourceFieldMappingClient: {
            async list() {
                return {
                    status: "found",
                    mappings:
                        fieldMappings
                };
            }
        },
        sourceResidentMappingClient: {
            async list() {
                return {
                    status: "found",
                    mappings:
                        residentMappings
                };
            }
        },
        sourceRecordIdentityMappingClient: {
            async get() {
                return sourceRecordIdentityMapping
                    ? {
                        status: "found",
                        mapping:
                            sourceRecordIdentityMapping
                    }
                    : {
                        status: "not_found",
                        mapping: null
                    };
            }
        },
        semanticRecordPreviewClient:
            semanticRecordPreviewClient || {
            async lookup({
                sourceRecordKeys
            }) {
                const defaults = [
                    {
                        sourceRecordKey:
                            "record-1",
                        recordId:
                            "semantic-record-1",
                        residentId:
                            "resident-1",
                        semanticType:
                            "support_record",
                        semanticContent: {
                            semanticType:
                                "support_record",
                            fields: {
                                record_date:
                                    "2026-09-17 09:00",
                                record_content:
                                    "記録1",
                                staff_name:
                                    null,
                                record_category:
                                    null,
                                created_at:
                                    null
                            },
                            customFields: {}
                        },
                        contentHash:
                            canonicalHash({
                                record_date:
                                    "2026-09-17 09:00",
                                record_content:
                                    "記録1",
                                staff_name:
                                    null,
                                record_category:
                                    null,
                                created_at:
                                    null
                            }),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-2"
                    }
                ];

                const records =
                    semanticRecords === null
                        ? defaults
                        : semanticRecords;

                return {
                    status: "found",
                    records:
                        records.filter(record =>
                            sourceRecordKeys.includes(
                                record.sourceRecordKey
                            )
                        )
                };
            }
        }
    });
}

test(
    "preview keeps physical rows and becomes ready only when every row has a confirmed resident",
    async () => {
        const digest =
            cryptoDigest("利用者A");

        const service =
            createService({
                entities: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                "利用者A",
                            "sheet:0:column:1":
                                "2026-09-17 09:00",
                            "sheet:0:column:2":
                                "記録1",
                            "sheet:0:column:3":
                                "record-1"
                        }
                    },
                    {
                        sourceEntityKey:
                            "sheet:0:row:3",
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                "利用者A",
                            "sheet:0:column:1":
                                "2026-09-17 09:00",
                            "sheet:0:column:2":
                                "記録1",
                            "sheet:0:column:3":
                                "record-2"
                        }
                    }
                ],
                fieldMappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "name"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:1",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_date"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_content"
                    }
                ],
                residentMappings: [
                    {
                        identifierType:
                            "name",
                        identifierDigest:
                            digest,
                        mappingStatus:
                            "confirmed",
                        residentId:
                            "resident-1"
                    }
                ]
            });

        const result =
            await service.preview({
                sourceDocumentKey:
                    "doc-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    100
            });

        assert.equal(
            result.status,
            "ready"
        );
        assert.equal(
            result.sourceEntityCount,
            2
        );
        assert.equal(
            result.readySourceEntityCount,
            2
        );
        assert.equal(
            result.readyRowCount,
            2
        );
        assert.equal(
            result.invalidRowCount,
            0
        );
        assert.equal(
            result.existingRecordCount,
            1
        );
        assert.equal(
            result.newRecordCount,
            1
        );
        assert.equal(
            result.unchangedRecordCount,
            1
        );
        assert.equal(
            result.updateCandidateCount,
            0
        );
        assert.equal(
            result.reviewRequiredCount,
            0
        );
        assert.equal(
            result.semanticPreviewBatchCount,
            1
        );
        assert.equal(
            result.duplicateSourceRecordKeyCount,
            0
        );
        assert.equal(
            result.sample.length,
            2
        );
        assert.notEqual(
            result.sample[0].sourceEntityKey,
            result.sample[1].sourceEntityKey
        );
        assert.match(
            result.previewFingerprint,
            /^[0-9a-f]{64}$/
        );
    }
);

test(
    "public preview does not expose execution plan and internal plan is bound to fingerprint",
    async () => {
        const digest =
            cryptoDigest("利用者A");

        const service =
            createService({
                entities: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                "利用者A",
                            "sheet:0:column:1":
                                "2026-09-17 09:00",
                            "sheet:0:column:2":
                                "新規記録",
                            "sheet:0:column:3":
                                "record-new"
                        }
                    }
                ],
                fieldMappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "name"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:1",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_date"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_content"
                    }
                ],
                residentMappings: [
                    {
                        identifierType:
                            "name",
                        identifierDigest:
                            digest,
                        mappingStatus:
                            "confirmed",
                        residentId:
                            "resident-1"
                    }
                ],
                semanticRecords: []
            });

        const input = {
            sourceDocumentKey: "doc-1",
            sourceUpdatedAt:
                "2026-09-17T00:00:00.000Z",
            sourceSize: 100
        };

        const publicPreview =
            await service.preview(input);

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                publicPreview,
                "executionPlan"
            ),
            false
        );

        const internal =
            await service.buildExecutionPlan(
                input
            );

        assert.equal(
            internal.status,
            "ready"
        );
        assert.equal(
            internal.previewFingerprint,
            publicPreview.previewFingerprint
        );
        assert.equal(
            internal.executionPlan.length,
            1
        );

        const entry =
            internal.executionPlan[0];

        assert.equal(
            entry.sourceRecordKey,
            "record-new"
        );
        assert.equal(
            entry.residentId,
            "resident-1"
        );
        assert.equal(
            entry.action,
            "new"
        );
        assert.equal(
            entry.recordId,
            null
        );
        assert.equal(
            entry.baselineHash,
            null
        );
        assert.match(
            entry.targetHash,
            /^[0-9a-f]{64}$/
        );
        assert.equal(
            entry.canonicalizationVersion,
            "risen-semantic-canonicalization-2"
        );
        assert.deepEqual(
            entry.targetSemanticContent,
            canonicalizer.process({
                record_date:
                    "2026-09-17 09:00",
                record_content:
                    "新規記録",
                staff_name: null,
                record_category: null,
                created_at: null
            }).semanticContent
        );
    }
);

test(
    "preview is blocked by an unconfirmed resident mapping",
    async () => {
        const service =
            createService({
                entities: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                "利用者A"
                        }
                    }
                ],
                fieldMappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "name"
                    }
                ],
                residentMappings: []
            });

        const result =
            await service.preview({
                sourceDocumentKey:
                    "doc-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    100
            });

        assert.equal(
            result.status,
            "blocked"
        );
        assert.equal(
            result.unresolvedResidentCount,
            1
        );
        assert.equal(
            result.previewFingerprint,
            null
        );
    }
);

test(
    "preview is blocked when a physical row has no resident name",
    async () => {
        const service =
            createService({
                entities: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                ""
                        }
                    }
                ],
                fieldMappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "name"
                    }
                ],
                residentMappings: []
            });

        const result =
            await service.preview({
                sourceDocumentKey:
                    "doc-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    100
            });

        assert.equal(
            result.status,
            "blocked"
        );
        assert.equal(
            result.missingResidentNameCount,
            1
        );
    }
);


test(
    "preview is blocked when source record identity mapping is unavailable",
    async () => {
        const service =
            createService({
                entities: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                "利用者A"
                        }
                    }
                ],
                fieldMappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "name"
                    }
                ],
                residentMappings: [],
                sourceRecordIdentityMapping:
                    null
            });

        const result =
            await service.preview({
                sourceDocumentKey:
                    "doc-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    100
            });

        assert.equal(
            result.status,
            "blocked"
        );
        assert.equal(
            result.blockReason,
            "source_record_identity_mapping_unavailable"
        );
    }
);


test(
    "preview uses 500-row batches with at most six concurrent lookups",
    async () => {
        const crypto =
            require("node:crypto");

        const residentName =
            "並列確認利用者";

        const digest =
            crypto
                .createHash("sha256")
                .update(residentName, "utf8")
                .digest("hex");

        const entities =
            Array.from(
                { length: 3001 },
                (_, index) => ({
                    sourceEntityKey:
                        `sheet:0:row:${index + 2}`,
                    valuesBySourceFieldKey: {
                        "sheet:0:column:0":
                            residentName,
                        "sheet:0:column:1":
                            "2026-09-17 09:00",
                        "sheet:0:column:2":
                            "記録",
                        "sheet:0:column:3":
                            `record-${index}`
                    }
                })
            );

        let activeLookups = 0;
        let maximumActiveLookups = 0;
        const batchSizes = [];

        const semanticRecordPreviewClient = {
            async lookup({
                sourceRecordKeys
            }) {
                activeLookups += 1;
                maximumActiveLookups =
                    Math.max(
                        maximumActiveLookups,
                        activeLookups
                    );

                batchSizes.push(
                    sourceRecordKeys.length
                );

                await new Promise(resolve =>
                    setTimeout(resolve, 5)
                );

                activeLookups -= 1;

                return {
                    status: "found",
                    records: []
                };
            }
        };

        const service =
            createService({
                entities,
                fieldMappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "name"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:1",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_date"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_content"
                    }
                ],
                residentMappings: [
                    {
                        identifierType:
                            "name",
                        identifierDigest:
                            digest,
                        mappingStatus:
                            "confirmed",
                        residentId:
                            "resident-1"
                    }
                ],
                semanticRecords: [],
                semanticRecordPreviewClient
            });

        const result =
            await service.preview({
                sourceDocumentKey:
                    "doc-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    100
            });

        assert.equal(
            result.status,
            "ready"
        );
        assert.equal(
            result.sourceEntityCount,
            3001
        );
        assert.equal(
            result.readyRowCount,
            3001
        );
        assert.equal(
            result.newRecordCount,
            3001
        );
        assert.equal(
            result.semanticPreviewBatchCount,
            7
        );
        assert.deepEqual(
            batchSizes,
            [
                500,
                500,
                500,
                500,
                500,
                500,
                1
            ]
        );
        assert.equal(
            maximumActiveLookups,
            6
        );
    }
);

test(
    "preview validates each lookup window before requesting the next window",
    async () => {
        const crypto =
            require("node:crypto");

        const residentName =
            "停止確認利用者";

        const digest =
            crypto
                .createHash("sha256")
                .update(residentName, "utf8")
                .digest("hex");

        const entities =
            Array.from(
                { length: 3001 },
                (_, index) => ({
                    sourceEntityKey:
                        `sheet:0:row:${index + 2}`,
                    valuesBySourceFieldKey: {
                        "sheet:0:column:0":
                            residentName,
                        "sheet:0:column:1":
                            "2026-09-17 09:00",
                        "sheet:0:column:2":
                            "記録",
                        "sheet:0:column:3":
                            `record-${index}`
                    }
                })
            );

        let lookupCount = 0;

        const semanticRecordPreviewClient = {
            async lookup() {
                lookupCount += 1;

                if (lookupCount === 1) {
                    return {
                        status: "unavailable",
                        records: []
                    };
                }

                return {
                    status: "found",
                    records: []
                };
            }
        };

        const service =
            createService({
                entities,
                fieldMappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "name"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:1",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_date"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        standardEntityName:
                            "support_record",
                        standardFieldName:
                            "record_content"
                    }
                ],
                residentMappings: [
                    {
                        identifierType:
                            "name",
                        identifierDigest:
                            digest,
                        mappingStatus:
                            "confirmed",
                        residentId:
                            "resident-1"
                    }
                ],
                semanticRecords: [],
                semanticRecordPreviewClient
            });

        await assert.rejects(
            service.preview({
                sourceDocumentKey:
                    "doc-1",
                sourceUpdatedAt:
                    "2026-09-17T00:00:00.000Z",
                sourceSize:
                    100
            }),
            /Semantic record preview is unavailable/
        );

        assert.equal(
            lookupCount,
            6
        );
    }
);

function cryptoDigest(value) {
    return require("node:crypto")
        .createHash("sha256")
        .update(value, "utf8")
        .digest("hex");
}


function createSingleRowService({
    sourceOverrides = {},
    existingOverrides = {}
} = {}) {
    const digest =
        cryptoDigest("利用者A");

    const baseExisting = {
        sourceRecordKey: "record-1",
        recordId: "semantic-record-1",
        residentId: "resident-1",
        semanticType: "support_record",
        semanticContent: {
            semanticType: "support_record",
            fields: {
                record_date:
                    "2026-09-17 09:00",
                record_content:
                    "記録1",
                staff_name:
                    "職員A",
                record_category:
                    "日常",
                created_at:
                    "2026-09-17 09:01"
            },
            customFields: {}
        },
        contentHash:
            canonicalHash({
                record_date:
                    "2026-09-17 09:00",
                record_content:
                    "記録1",
                staff_name:
                    "職員A",
                record_category:
                    "日常",
                created_at:
                    "2026-09-17 09:01"
            }),
        canonicalizationVersion:
            "risen-semantic-canonicalization-2"
    };

    return createService({
        entities: [
            {
                sourceEntityKey:
                    "sheet:0:row:2",
                valuesBySourceFieldKey: {
                    "sheet:0:column:0":
                        "利用者A",
                    "sheet:0:column:1":
                        "2026-09-17 09:00",
                    "sheet:0:column:2":
                        "記録1",
                    "sheet:0:column:3":
                        "record-1",
                    "sheet:0:column:4":
                        "職員A",
                    "sheet:0:column:5":
                        "日常",
                    "sheet:0:column:6":
                        "2026-09-17 09:01",
                    ...sourceOverrides
                }
            }
        ],
        fieldMappings: [
            {
                sourceFieldKey:
                    "sheet:0:column:0",
                standardEntityName: "user",
                standardFieldName: "name"
            },
            {
                sourceFieldKey:
                    "sheet:0:column:1",
                standardEntityName:
                    "support_record",
                standardFieldName:
                    "record_date"
            },
            {
                sourceFieldKey:
                    "sheet:0:column:2",
                standardEntityName:
                    "support_record",
                standardFieldName:
                    "record_content"
            },
            {
                sourceFieldKey:
                    "sheet:0:column:4",
                standardEntityName:
                    "support_record",
                standardFieldName:
                    "staff_name"
            },
            {
                sourceFieldKey:
                    "sheet:0:column:5",
                standardEntityName:
                    "support_record",
                standardFieldName:
                    "record_category"
            },
            {
                sourceFieldKey:
                    "sheet:0:column:6",
                standardEntityName:
                    "support_record",
                standardFieldName:
                    "created_at"
            }
        ],
        residentMappings: [
            {
                identifierType: "name",
                identifierDigest: digest,
                mappingStatus: "confirmed",
                residentId: "resident-1"
            }
        ],
        semanticRecords: [
            {
                ...baseExisting,
                ...existingOverrides
            }
        ]
    });
}

async function previewSingleRow(service) {
    return service.preview({
        sourceDocumentKey: "doc-1",
        sourceUpdatedAt:
            "2026-09-17T00:00:00.000Z",
        sourceSize: 100
    });
}

test(
    "STEP5 classifies a changed nonblank value as update candidate",
    async () => {
        const service =
            createSingleRowService({
                sourceOverrides: {
                    "sheet:0:column:2":
                        "更新された記録"
                }
            });

        const result =
            await previewSingleRow(service);

        assert.equal(result.status, "ready");
        assert.equal(
            result.updateCandidateCount,
            1
        );
        assert.equal(
            result.unchangedRecordCount,
            0
        );
        assert.equal(
            result.reviewRequiredCount,
            0
        );
    }
);

test(
    "STEP5 blocks update when existing semantic content does not match stored hash",
    async () => {
        const service =
            createSingleRowService({
                sourceOverrides: {
                    "sheet:0:column:2":
                        "更新された記録"
                },
                existingOverrides: {
                    contentHash:
                        "a".repeat(64)
                }
            });

        const result =
            await previewSingleRow(service);

        assert.equal(
            result.status,
            "blocked"
        );
        assert.equal(
            result.invalidRowCount,
            1
        );
        assert.equal(
            result.invalidReasons
                .existing_content_hash_mismatch,
            1
        );
        assert.equal(
            result.updateCandidateCount,
            0
        );
        assert.equal(
            result.previewFingerprint,
            null
        );
    }
);

test(
    "STEP5 preserves an existing optional value when source is blank",
    async () => {
        const service =
            createSingleRowService({
                sourceOverrides: {
                    "sheet:0:column:4": ""
                }
            });

        const result =
            await previewSingleRow(service);

        assert.equal(result.status, "ready");
        assert.equal(
            result.unchangedRecordCount,
            1
        );
        assert.equal(
            result.updateCandidateCount,
            0
        );
    }
);

test(
    "STEP5 blocks an incompatible v1 existing record for review",
    async () => {
        const service =
            createSingleRowService({
                existingOverrides: {
                    canonicalizationVersion:
                        "risen-semantic-canonicalization-1",
                    semanticContent: {
                        semanticType:
                            "support_record",
                        fields: {
                            supportContent:
                                "旧形式"
                        },
                        customFields: {}
                    }
                }
            });

        const result =
            await previewSingleRow(service);

        assert.equal(result.status, "blocked");
        assert.equal(
            result.reviewRequiredCount,
            1
        );
    }
);

test(
    "STEP5 blocks a resident mismatch for review",
    async () => {
        const service =
            createSingleRowService({
                existingOverrides: {
                    residentId:
                        "different-resident"
                }
            });

        const result =
            await previewSingleRow(service);

        assert.equal(result.status, "blocked");
        assert.equal(
            result.reviewRequiredCount,
            1
        );
    }
);


test(
    "STEP5 blocks when existing content hash does not match canonical content",
    async () => {
        const service =
            createSingleRowService({
                existingOverrides: {
                    contentHash:
                        "a".repeat(64)
                }
            });

        const result =
            await previewSingleRow(service);

        assert.equal(
            result.status,
            "blocked"
        );
        assert.equal(
            result.invalidRowCount,
            1
        );
        assert.equal(
            result.invalidReasons
                .existing_content_hash_mismatch,
            1
        );
        assert.equal(
            result.unchangedRecordCount,
            0
        );
    }
);
