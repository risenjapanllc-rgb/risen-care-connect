"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SourceResidentCandidateResolver =
    require("./SourceResidentCandidateResolver");

function createResolver({
    mappings,
    sourceEntities,
    candidates = []
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
