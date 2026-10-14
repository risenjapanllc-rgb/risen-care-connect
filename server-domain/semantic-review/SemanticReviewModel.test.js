"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SemanticReviewModel =
    require("./SemanticReviewModel");

test(
    "Semantic Review summary separates candidates from real review items",
    () => {
        const summary =
            SemanticReviewModel
                .summarize([
                    {
                        status:
                            "registered"
                    },
                    {
                        status:
                            "alias"
                    },
                    {
                        status:
                            "exact"
                    },
                    {
                        status:
                            "context"
                    },
                    {
                        status:
                            "review"
                    },
                    {
                        status:
                            "ambiguous"
                    }
                ]);

        assert.deepEqual(
            summary,
            {
                total: 6,
                registered: 1,
                resolved: 2,
                candidate: 1,
                conflict: 1,
                unresolved: 1,
                review: 2
            }
        );
    }
);

test(
    "Semantic Review item uses original evidence without knowing CSV type",
    () => {
        const review =
            SemanticReviewModel
                .toReviewItem({
                    item: {
                        sourceFieldKey:
                            "sheet:0:column:15",
                        label:
                            "気温",
                        status:
                            "context",
                        semanticMeaning:
                            "support_record.temperature",
                        displayName:
                            "記録時気温",
                        candidates: []
                    },

                    standardFields: [],

                    analysis: {
                        extracted: {
                            semanticEvidence: [
                                {
                                    sourceFieldKey:
                                        "sheet:0:column:15",
                                    sampleValues: [
                                        "23.8",
                                        "23.7"
                                    ],
                                    neighboringFields: [
                                        "日時",
                                        "氏名"
                                    ]
                                }
                            ]
                        }
                    }
                });

        assert.equal(
            review.state,
            "candidate"
        );

        assert.equal(
            review.displayName,
            "記録時気温"
        );

        assert.deepEqual(
            review.evidence
                .sampleValues,
            [
                "23.8",
                "23.7"
            ]
        );
    }
);

test(
    "Semantic Review item exposes unresolved as the preserved original state",
    () => {
        const review =
            SemanticReviewModel
                .toReviewItem({
                    item: {
                        sourceFieldKey:
                            "sheet:0:column:24",
                        label:
                            "状態",
                        status:
                            "review",
                        semanticMeaning:
                            null,
                        displayName:
                            null,
                        candidates: []
                    },

                    standardFields: [],

                    analysis: {
                        extracted: {
                            semanticEvidence: [
                                {
                                    sourceFieldKey:
                                        "sheet:0:column:24",
                                    sampleValues: [
                                        "1",
                                        "3",
                                        "503",
                                        "501",
                                        "0"
                                    ],
                                    neighboringFields: [
                                        "日時",
                                        "氏名",
                                        "種類",
                                        "行動"
                                    ]
                                }
                            ]
                        }
                    }
                });

        assert.equal(
            review.state,
            "unresolved"
        );

        assert.equal(
            review.semanticMeaning,
            ""
        );

        assert.deepEqual(
            review.evidence.sampleValues,
            [
                "1",
                "3",
                "503",
                "501",
                "0"
            ]
        );
    }
);

test(
    "Semantic Review item separates source field with no original values as empty",
    () => {
        const review =
            SemanticReviewModel
                .toReviewItem({
                    item: {
                        sourceFieldKey:
                            "sheet:0:column:10",
                        label:
                            "データ4",
                        status:
                            "review",
                        semanticMeaning:
                            null,
                        displayName:
                            null,
                        candidates: []
                    },

                    standardFields: [],

                    analysis: {
                        extracted: {
                            semanticEvidence: [
                                {
                                    sourceFieldKey:
                                        "sheet:0:column:10",
                                    sampleValues: [],
                                    neighboringFields: [
                                        "日時",
                                        "氏名"
                                    ]
                                }
                            ]
                        }
                    }
                });

        assert.equal(
            review.state,
            "empty"
        );

        assert.equal(
            review.evidence.hasEvidence,
            true
        );

        assert.deepEqual(
            review.evidence.sampleValues,
            []
        );
    }
);

test(
    "Semantic Review item without matching evidence remains unresolved",
    () => {
        const review =
            SemanticReviewModel
                .toReviewItem({
                    item: {
                        sourceFieldKey:
                            "sheet:0:column:99",
                        label:
                            "未知",
                        status:
                            "review",
                        semanticMeaning:
                            null,
                        displayName:
                            null,
                        candidates: []
                    },

                    standardFields: [],

                    analysis: {
                        extracted: {
                            semanticEvidence: []
                        }
                    }
                });

        assert.equal(
            review.state,
            "unresolved"
        );

        assert.equal(
            review.evidence.hasEvidence,
            false
        );
    }
);
