"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SemanticAnalysisContract =
    require("./SemanticAnalysisContract");


function createAnalysis(
    overrides = {}
) {
    return {
        perspectiveResolution: {
            resolutionMode:
                "resolved",

            perspectiveType:
                "facility_operation",

            subjectScope:
                "multiple_residents",

            temporalScope:
                "as_of_time",

            interpretation:
                "当日時点で施設が把握している入院中利用者の状況",

            confidence:
                "high",

            facilityQuestion:
                ""
        },

        semanticDecomposition: {
            decompositionMode:
                "decomposed",

            sourceScope:
                "multiple_residents",

            facts: [
                {
                    subject: {
                        type:
                            "resident",

                        reference:
                            "source-resident-1"
                    },

                    naturalMeaning:
                        "この利用者の入院開始日",

                    value:
                        "2026-04-18",

                    time: {
                        mode:
                            "event",

                        value:
                            "2026-04-18"
                    },

                    sourceEvidence: {
                        sourceLabel:
                            "入院",

                        sourceValue:
                            "利用者名 4/18 ○○病院"
                    },

                    confidence:
                        "high"
                },

                {
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
                        "high"
                }
            ],

            facilityQuestion:
                ""
        },

        ...overrides
    };
}


test(
    "accepts perspective resolution with semantic decomposition",
    () => {
        const analysis =
            createAnalysis();

        assert.deepStrictEqual(
            SemanticAnalysisContract
                .validate(
                    analysis
                ),
            {
                status:
                    "valid",

                semanticAnalysis:
                    analysis
            }
        );
    }
);


test(
    "accepts review without inventing decomposition",
    () => {
        const analysis =
            createAnalysis({
                perspectiveResolution: {
                    resolutionMode:
                        "review",

                    perspectiveType:
                        "unknown",

                    subjectScope:
                        "unknown",

                    temporalScope:
                        "unknown",

                    interpretation:
                        "",

                    confidence:
                        "low",

                    facilityQuestion:
                        "この欄は施設全体の状況ですか、それとも個人ごとの記録ですか？"
                },

                semanticDecomposition: {
                    decompositionMode:
                        "review",

                    sourceScope:
                        "unknown",

                    facts:
                        [],

                    facilityQuestion:
                        "記載内容は利用者ごとに分けて扱いますか？"
                }
            });

        assert.equal(
            SemanticAnalysisContract
                .validate(
                    analysis
                )
                .status,
            "valid"
        );
    }
);


test(
    "rejects invalid perspective resolution",
    () => {
        const analysis =
            createAnalysis();

        analysis
            .perspectiveResolution
            .perspectiveType =
                "invalid-perspective";

        assert.equal(
            SemanticAnalysisContract
                .validate(
                    analysis
                )
                .status,
            "invalid"
        );
    }
);


test(
    "rejects invalid semantic decomposition",
    () => {
        const analysis =
            createAnalysis();

        analysis
            .semanticDecomposition
            .facts =
                [];

        assert.equal(
            SemanticAnalysisContract
                .validate(
                    analysis
                )
                .status,
            "invalid"
        );
    }
);


test(
    "does not accept Formal Meaning at analysis level",
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
            assert.equal(
                SemanticAnalysisContract
                    .validate(
                        createAnalysis(
                            forbidden
                        )
                    )
                    .status,
                "invalid"
            );
        }
    }
);


test(
    "rejects non-object analysis",
    () => {
        for (const value of [
            null,
            undefined,
            [],
            "analysis",
            123
        ]) {
            assert.deepStrictEqual(
                SemanticAnalysisContract
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
