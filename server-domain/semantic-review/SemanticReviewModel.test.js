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
