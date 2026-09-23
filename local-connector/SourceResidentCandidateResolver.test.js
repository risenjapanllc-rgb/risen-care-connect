"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceResidentCandidateResolver =
    require("./SourceResidentCandidateResolver");

function createResolver({
    mappings,
    sourceEntities,
    candidates = [],
    interpretations = null
} = {}) {
    const calls = {
        mappingList: [],
        candidateLookup: []
    };

    const resolver =
        new SourceResidentCandidateResolver({
            localConnectorService: {
                async resolveSourceSnapshot(snapshot) {
                    return {
                        ...snapshot,
                        analysis: {
                            extracted: {
                                sourceEntities:
                                    sourceEntities || []
                            }
                        }
                    };
                }
            },
            sourceFieldMappingClient: {
                async list(
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                ) {
                    calls.mappingList.push({
                        sourceDocumentKey,
                        sourceUpdatedAt,
                        sourceSize
                    });

                    return {
                        status: "found",
                        mappings:
                            mappings || []
                    };
                }
            },

        sourceFieldInterpretationClient: {
            async list() {
                const safeMappings =
                    Array.isArray(mappings)
                        ? mappings
                        : [];

                return {
                    status: "found",
                    interpretations:
                        Array.isArray(interpretations)
                            ? interpretations
                            : safeMappings.map(mapping => ({
                            sourceFieldKey:
                                mapping.sourceFieldKey,
                            interpretationStatus:
                                "confirmed",
                            mappingStatus:
                                "confirmed",
                            confirmedMeaning:
                                mapping.standardEntityName +
                                "." +
                                mapping.standardFieldName,
                            confirmedByHuman:
                                true
                            }))
                };
            }
        },
        residentCandidateClient: {
                async findCandidates(identifier) {
                    calls.candidateLookup.push(
                        identifier
                    );

                    return candidates;
                }
            }
        });

    return {
        resolver,
        calls
    };
}

test("derives userCode only from confirmed user.user_code sourceFieldKey and structural source entity value", async () => {
    const { resolver, calls } =
        createResolver({
            mappings: [
                {
                    sourceFieldKey:
                        "sheet:0:column:0",
                    standardEntityName:
                        "user",
                    standardFieldName:
                        "user_code"
                }
            ],
            sourceEntities: [
                {
                    sourceEntityKey:
                        "sheet:0:row:2",
                    fields: {
                        "利用者番号":
                            "must-not-be-used"
                    },
                    valuesBySourceFieldKey: {
                        "sheet:0:column:0":
                            " U001 "
                    }
                }
            ],
            candidates: [
                {
                    residentId:
                        "resident-1",
                    userCode:
                        "U001"
                }
            ]
        });

    const result =
        await resolver.findCandidates({
            sourceDocumentKey:
                "opaque-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520,
            sourceEntityKey:
                "sheet:0:row:2"
        });

    assert.deepStrictEqual(
        calls.mappingList,
        [
            {
                sourceDocumentKey:
                    "opaque-document-1",
                sourceUpdatedAt:
                    "2026-09-15T02:30:00.000Z",
                sourceSize:
                    9520
            }
        ]
    );

    assert.deepStrictEqual(
        calls.candidateLookup,
        [
            {
                userCode: "U001"
            }
        ]
    );

    assert.deepStrictEqual(
        result,
        {
            status: "matched",
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

test("falls back to confirmed user.name when user.user_code mapping is unavailable", async () => {
    const { resolver, calls } =
        createResolver({
            mappings: [
                {
                    sourceFieldKey:
                        "sheet:0:column:1",
                    standardEntityName:
                        "user",
                    standardFieldName:
                        "name"
                }
            ],
            sourceEntities: [
                {
                    sourceEntityKey:
                        "sheet:0:row:2",
                    valuesBySourceFieldKey: {
                        "sheet:0:column:1":
                            " Test Resident "
                    }
                }
            ],
            candidates: [
                {
                    residentId:
                        "resident-1",
                    userCode:
                        null,
                    name:
                        "Test Resident"
                }
            ]
        });

    const result =
        await resolver.findCandidates({
            sourceDocumentKey:
                "opaque-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520,
            sourceEntityKey:
                "sheet:0:row:2"
        });

    assert.deepStrictEqual(
        calls.candidateLookup,
        [
            {
                name:
                    "Test Resident"
            }
        ]
    );

    assert.deepStrictEqual(
        result,
        {
            status: "matched",
            candidates: [
                {
                    residentId:
                        "resident-1",
                    userCode:
                        null,
                    name:
                        "Test Resident"
                }
            ]
        }
    );
});

test("fails closed unless exactly one persisted user.user_code mapping exists", async () => {
    for (const mappings of [
        [],
        [
            {
                sourceFieldKey:
                    "sheet:0:column:0",
                standardEntityName:
                    "user",
                standardFieldName:
                    "user_code"
            },
            {
                sourceFieldKey:
                    "sheet:0:column:1",
                standardEntityName:
                    "user",
                standardFieldName:
                    "user_code"
            }
        ]
    ]) {
        const { resolver, calls } =
            createResolver({
                mappings,
                sourceEntities: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        valuesBySourceFieldKey: {
                            "sheet:0:column:0":
                                "U001",
                            "sheet:0:column:1":
                                "U002"
                        }
                    }
                ]
            });

        await assert.rejects(
            () =>
                resolver.findCandidates({
                    sourceDocumentKey:
                        "opaque-document-1",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        9520,
                    sourceEntityKey:
                        "sheet:0:row:2"
                }),
            error =>
                error?.code ===
                "resident_identifier_mapping_unavailable"
        );

        assert.deepStrictEqual(
            calls.candidateLookup,
            []
        );
    }
});

test("fails closed for missing source entity or blank structural identifier", async () => {
    for (const sourceEntities of [
        [],
        [
            {
                sourceEntityKey:
                    "sheet:0:row:2",
                valuesBySourceFieldKey: {
                    "sheet:0:column:0":
                        "   "
                }
            }
        ]
    ]) {
        const { resolver, calls } =
            createResolver({
                mappings: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        standardEntityName:
                            "user",
                        standardFieldName:
                            "user_code"
                    }
                ],
                sourceEntities
            });

        await assert.rejects(
            () =>
                resolver.findCandidates({
                    sourceDocumentKey:
                        "opaque-document-1",
                    sourceUpdatedAt:
                        "2026-09-15T02:30:00.000Z",
                    sourceSize:
                        9520,
                    sourceEntityKey:
                        "sheet:0:row:2"
                }),
            error =>
                [
                    "source_entity_not_found",
                    "resident_identifier_unavailable"
                ].includes(error?.code)
        );

        assert.deepStrictEqual(
            calls.candidateLookup,
            []
        );
    }
});

test("groups duplicate confirmed name values before candidate lookup without auto-confirming", async () => {
    const sourceEntities =
        Array.from(
            { length: 100 },
            (_, index) => ({
                sourceEntityKey:
                    `sheet:0:row:${index + 2}`,
                valuesBySourceFieldKey: {
                    "sheet:0:column:1":
                        " Test Resident "
                }
            })
        );

    const { resolver, calls } =
        createResolver({
            mappings: [
                {
                    sourceFieldKey:
                        "sheet:0:column:1",
                    standardEntityName:
                        "user",
                    standardFieldName:
                        "name"
                }
            ],
            sourceEntities,
            candidates: [
                {
                    residentId:
                        "resident-1",
                    userCode:
                        null,
                    name:
                        "Test Resident"
                }
            ]
        });

    const result =
        await resolver.findCandidateGroups({
            sourceDocumentKey:
                "opaque-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.deepStrictEqual(
        calls.candidateLookup,
        [
            {
                name:
                    "Test Resident"
            }
        ]
    );

    assert.equal(
        calls.mappingList.length,
        1
    );

    assert.equal(
        result.identifierType,
        "name"
    );

    assert.equal(
        result.sourceEntityCount,
        100
    );

    assert.equal(
        result.unavailableSourceEntityCount,
        0
    );

    assert.equal(
        result.groups.length,
        1
    );

    assert.equal(
        result.groups[0].sourceEntityCount,
        100
    );

    assert.equal(
        result.groups[0].identifierValue,
        "Test Resident"
    );

    assert.equal(
        result.groups[0].status,
        "matched"
    );

    assert.match(
        result.groups[0].identifierDigest,
        /^[0-9a-f]{64}$/
    );

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            result.groups[0],
            "residentId"
        ),
        false
    );

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            result.groups[0],
            "mappingStatus"
        ),
        false
    );
});

test("looks up each distinct confirmed identifier value once", async () => {
    const { resolver, calls } =
        createResolver({
            mappings: [
                {
                    sourceFieldKey:
                        "sheet:0:column:1",
                    standardEntityName:
                        "user",
                    standardFieldName:
                        "name"
                }
            ],
            sourceEntities: [
                {
                    sourceEntityKey:
                        "sheet:0:row:2",
                    valuesBySourceFieldKey: {
                        "sheet:0:column:1":
                            "Resident A"
                    }
                },
                {
                    sourceEntityKey:
                        "sheet:0:row:3",
                    valuesBySourceFieldKey: {
                        "sheet:0:column:1":
                            "Resident B"
                    }
                },
                {
                    sourceEntityKey:
                        "sheet:0:row:4",
                    valuesBySourceFieldKey: {
                        "sheet:0:column:1":
                            "Resident A"
                    }
                }
            ]
        });

    const result =
        await resolver.findCandidateGroups({
            sourceDocumentKey:
                "opaque-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.deepStrictEqual(
        calls.candidateLookup,
        [
            {
                name:
                    "Resident A"
            },
            {
                name:
                    "Resident B"
            }
        ]
    );

    assert.deepStrictEqual(
        result.groups.map(
            group =>
                group.sourceEntityCount
        ),
        [2, 1]
    );
});

test("does not expose user_code as identifierValue in bulk result", async () => {
    const { resolver } =
        createResolver({
            mappings: [
                {
                    sourceFieldKey:
                        "sheet:0:column:0",
                    standardEntityName:
                        "user",
                    standardFieldName:
                        "user_code"
                }
            ],
            sourceEntities: [
                {
                    sourceEntityKey:
                        "sheet:0:row:2",
                    valuesBySourceFieldKey: {
                        "sheet:0:column:0":
                            " U001 "
                    }
                }
            ]
        });

    const result =
        await resolver.findCandidateGroups({
            sourceDocumentKey:
                "opaque-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.equal(
        result.groups.length,
        1
    );

    assert.equal(
        result.groups[0].identifierValue,
        null
    );
});

test("skips blank identifiers in bulk lookup and reports their physical row count", async () => {
    const { resolver, calls } =
        createResolver({
            mappings: [
                {
                    sourceFieldKey:
                        "sheet:0:column:0",
                    standardEntityName:
                        "user",
                    standardFieldName:
                        "user_code"
                }
            ],
            sourceEntities: [
                {
                    sourceEntityKey:
                        "sheet:0:row:2",
                    valuesBySourceFieldKey: {
                        "sheet:0:column:0":
                            "U001"
                    }
                },
                {
                    sourceEntityKey:
                        "sheet:0:row:3",
                    valuesBySourceFieldKey: {
                        "sheet:0:column:0":
                            "   "
                    }
                },
                {
                    sourceEntityKey:
                        "sheet:0:row:4",
                    valuesBySourceFieldKey: {}
                }
            ]
        });

    const result =
        await resolver.findCandidateGroups({
            sourceDocumentKey:
                "opaque-document-1",
            sourceUpdatedAt:
                "2026-09-15T02:30:00.000Z",
            sourceSize:
                9520
        });

    assert.deepStrictEqual(
        calls.candidateLookup,
        [
            {
                userCode:
                    "U001"
            }
        ]
    );

    assert.equal(
        result.identifierType,
        "user_code"
    );

    assert.equal(
        result.sourceEntityCount,
        3
    );

    assert.equal(
        result.unavailableSourceEntityCount,
        2
    );

    assert.equal(
        result.groups.length,
        1
    );
});


test(
    "rejects resident identity mapping without human confirmation",
    async () => {
        const { resolver, calls } =
            createResolver({
                mappings: [{
                    sourceFieldKey: "field:test",
                    standardEntityName: "user",
                    standardFieldName: "user_code"
                }],
                interpretations: [{
                    sourceFieldKey: "field:test",
                    interpretationStatus: "candidate",
                    mappingStatus: "candidate",
                    confirmedMeaning: "user.user_code",
                    confirmedByHuman: false
                }],
                sourceEntities: [{
                    sourceEntityKey: "row:1",
                    valuesBySourceFieldKey: {
                        "field:test": "VALUE"
                    }
                }]
            });

        await assert.rejects(
            () =>
                resolver.findCandidateGroups({
                    sourceDocumentKey: "document:test",
                    sourceUpdatedAt:
                        "2026-09-21T00:00:00.000Z",
                    sourceSize: 100
                }),
            error =>
                error?.code ===
                "resident_identifier_mapping_unavailable"
        );

        assert.equal(calls.candidateLookup.length, 0);
    }
);

test(
    "rejects resident identity mapping when confirmed meaning differs",
    async () => {
        const { resolver, calls } =
            createResolver({
                mappings: [{
                    sourceFieldKey: "field:test",
                    standardEntityName: "user",
                    standardFieldName: "user_code"
                }],
                interpretations: [{
                    sourceFieldKey: "field:test",
                    interpretationStatus: "confirmed",
                    mappingStatus: "confirmed",
                    confirmedMeaning: "user.name",
                    confirmedByHuman: true
                }],
                sourceEntities: [{
                    sourceEntityKey: "row:1",
                    valuesBySourceFieldKey: {
                        "field:test": "VALUE"
                    }
                }]
            });

        await assert.rejects(
            () =>
                resolver.findCandidateGroups({
                    sourceDocumentKey: "document:test",
                    sourceUpdatedAt:
                        "2026-09-21T00:00:00.000Z",
                    sourceSize: 100
                }),
            error =>
                error?.code ===
                "resident_identifier_mapping_unavailable"
        );

        assert.equal(calls.candidateLookup.length, 0);
    }
);

test("candidate groups preserve source entity keys for trusted semantic linkage", async () => {
    const resolver =
        new SourceResidentCandidateResolver({
            localConnectorService: {
                async resolveSourceSnapshot() {
                    return {
                        sourceDocumentKey: "doc-linkage",
                        sourceUpdatedAt:
                            "2026-09-22T00:00:00.000Z",
                        sourceSize: 10,
                        analysis: {
                            extracted: {
                                fieldDefinitions: [{
                                    sourceFieldKey: "name",
                                    headerLabel: "氏名"
                                }],
                                sourceEntities: [
                                    {
                                        sourceEntityKey: "row:1",
                                        valuesBySourceFieldKey: {
                                            name: "利用者A"
                                        }
                                    },
                                    {
                                        sourceEntityKey: "row:2",
                                        valuesBySourceFieldKey: {
                                            name: "利用者A"
                                        }
                                    }
                                ]
                            }
                        }
                    };
                }
            },
            sourceFieldMappingClient: {
                async list() {
                    return {
                        status: "found",
                        mappings: [{
                            sourceFieldKey: "name",
                            standardEntityName: "user",
                            standardFieldName: "name"
                        }]
                    };
                }
            },
            sourceFieldInterpretationClient: {
                async list() {
                    return {
                        status: "found",
                        interpretations: [{
                            sourceFieldKey: "name",
                            confirmedMeaning: "user.name",
                            confirmedByHuman: true
                        }]
                    };
                }
            },
            residentCandidateClient: {
                async findCandidates() {
                    return [];
                }
            }
        });

    const result =
        await resolver.findCandidateGroups({
            sourceDocumentKey: "doc-linkage",
            sourceUpdatedAt:
                "2026-09-22T00:00:00.000Z",
            sourceSize: 10
        });

    assert.strictEqual(
        result.groups.length,
        1
    );

    assert.deepStrictEqual(
        result.groups[0].sourceEntityKeys,
        ["row:1", "row:2"]
    );

    assert.strictEqual(
        result.groups[0].sourceEntityCount,
        2
    );
});
