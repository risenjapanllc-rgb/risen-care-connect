"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SemanticDecompositionContract =
    require("./SemanticDecompositionContract");


function createFact(
    overrides = {}
) {
    return {
        subject: {
            type:
                "resident",

            reference:
                "source-resident-1"
        },

        naturalMeaning:
            "この利用者が入院している病院",

        value:
            "○○病院",

        time: {
            mode:
                "as_of_time",

            value:
                "2026-04-21"
        },

        sourceEvidence: {
            sourceLabel:
                "入院",

            sourceValue:
                "利用者名 4/18 ○○病院"
        },

        confidence:
            "high",

        ...overrides
    };
}


function createDecomposition(
    overrides = {}
) {
    return {
        decompositionMode:
            "decomposed",

        sourceScope:
            "multiple_residents",

        facts: [
            createFact()
        ],

        facilityQuestion:
            "",

        ...overrides
    };
}


test(
    "accepts decomposed natural-language facts",
    () => {
        const decomposition =
            createDecomposition();

        assert.deepStrictEqual(
            SemanticDecompositionContract
                .validate(
                    decomposition
                ),
            {
                status:
                    "valid",

                semanticDecomposition:
                    decomposition
            }
        );
    }
);


test(
    "accepts multiple facts from one source",
    () => {
        const decomposition =
            createDecomposition({
                facts: [
                    createFact({
                        naturalMeaning:
                            "この利用者の入院開始日",

                        value:
                            "2026-04-18"
                    }),

                    createFact({
                        naturalMeaning:
                            "この利用者が入院している病院",

                        value:
                            "○○病院"
                    })
                ]
            });

        assert.equal(
            SemanticDecompositionContract
                .validate(
                    decomposition
                )
                .status,
            "valid"
        );
    }
);


test(
    "accepts review when decomposition is uncertain",
    () => {
        const decomposition =
            createDecomposition({
                decompositionMode:
                    "review",

                sourceScope:
                    "unknown",

                facts:
                    [],

                facilityQuestion:
                    "この欄では、1人ずつの入院日と入院先を記載しますか？"
            });

        assert.equal(
            SemanticDecompositionContract
                .validate(
                    decomposition
                )
                .status,
            "valid"
        );
    }
);


test(
    "review requires a natural-language facility question",
    () => {
        const decomposition =
            createDecomposition({
                decompositionMode:
                    "review",

                sourceScope:
                    "unknown",

                facts:
                    [],

                facilityQuestion:
                    ""
            });

        assert.deepStrictEqual(
            SemanticDecompositionContract
                .validate(
                    decomposition
                ),
            {
                status:
                    "invalid"
            }
        );
    }
);


test(
    "decomposed mode requires at least one fact",
    () => {
        const decomposition =
            createDecomposition({
                facts:
                    []
            });

        assert.equal(
            SemanticDecompositionContract
                .validate(
                    decomposition
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects Formal Meaning identifiers",
    () => {
        for (const forbidden of [
            {
                entityName:
                    "resident"
            },

            {
                fieldName:
                    "hospital"
            },

            {
                semanticType:
                    "hospitalization"
            },

            {
                canonicalCode:
                    "resident.hospital"
            }
        ]) {
            const decomposition =
                createDecomposition({
                    facts: [
                        createFact(
                            forbidden
                        )
                    ]
                });

            assert.equal(
                SemanticDecompositionContract
                    .validate(
                        decomposition
                    )
                    .status,
                "invalid"
            );
        }
    }
);


test(
    "rejects invalid fact shape",
    () => {
        for (const invalidFact of [
            null,
            [],
            {},
            {
                naturalMeaning:
                    ""
            }
        ]) {
            const decomposition =
                createDecomposition({
                    facts: [
                        invalidFact
                    ]
                });

            assert.equal(
                SemanticDecompositionContract
                    .validate(
                        decomposition
                    )
                    .status,
                "invalid"
            );
        }
    }
);


test(
    "rejects unsupported source scope",
    () => {
        assert.equal(
            SemanticDecompositionContract
                .validate(
                    createDecomposition({
                        sourceScope:
                            "something_else"
                    })
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects non-object decomposition",
    () => {
        for (const value of [
            null,
            undefined,
            [],
            "decomposition",
            123
        ]) {
            assert.deepStrictEqual(
                SemanticDecompositionContract
                    .validate(
                        value
                    ),
                {
                    status:
                        "invalid"
                }
            );
        }
    }
);


test(
    "accepts valid source evidence locator on a fact",
    () => {
        const decomposition =
            createDecomposition({
                facts: [
                    createFact({
                        sourceEvidenceLocator: {
                            sourceType:
                                "word",

                            documentReference:
                                "日勤日誌.docx",

                            location: {
                                tableIndex:
                                    2,

                                rowIndex:
                                    0,

                                sourceFieldKey:
                                    "word:table:2:row:0"
                            },

                            rawEvidence:
                                "利用者A【入院日】4月18日【病院】○○病院"
                        }
                    })
                ]
            });

        assert.equal(
            SemanticDecompositionContract
                .validate(
                    decomposition
                )
                .status,
            "valid"
        );
    }
);


test(
    "rejects invalid source evidence locator on a fact",
    () => {
        const decomposition =
            createDecomposition({
                facts: [
                    createFact({
                        sourceEvidenceLocator: {
                            sourceType:
                                "unsupported-source",

                            documentReference:
                                "source",

                            location:
                                {},

                            rawEvidence:
                                "value"
                        }
                    })
                ]
            });

        assert.equal(
            SemanticDecompositionContract
                .validate(
                    decomposition
                )
                .status,
            "invalid"
        );
    }
);
