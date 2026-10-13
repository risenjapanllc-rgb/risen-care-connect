"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SemanticEvidenceResolver =
    require(
        "./SemanticEvidenceResolver"
    );

test(
    "generic evidence resolver resolves different fields through catalog rules",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "気温"
                        },
                        {
                            sourceFieldKey:
                                "sheet:0:column:1",
                            headerLabel:
                                "天気"
                        },
                        {
                            sourceFieldKey:
                                "sheet:0:column:2",
                            headerLabel:
                                "行動"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            sampleValues: [
                                "23.8",
                                "24.1"
                            ]
                        },
                        {
                            sourceFieldKey:
                                "sheet:0:column:1",
                            sampleValues: [
                                "晴",
                                "曇"
                            ]
                        },
                        {
                            sourceFieldKey:
                                "sheet:0:column:2",
                            sampleValues: [
                                "睡眠状況",
                                "トイレ確認"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            3
        );

        assert.deepEqual(
            result.map(
                item =>
                    `${item.candidate.entityName}.${item.candidate.fieldName}`
            ),
            [
                "support_record.temperature",
                "support_record.weather",
                "support_record.activity"
            ]
        );
    }
);

test(
    "generic 状態 is not inferred when no catalog evidence rule exists",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "状態"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            sampleValues: [
                                "1",
                                "3",
                                "503"
                            ]
                        }
                    ]
                });

        assert.deepEqual(
            result,
            []
        );
    }
);

test(
    "resolver engine is reusable with externally supplied rules",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "field:a",
                            headerLabel:
                                "独自項目"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "field:a",
                            sampleValues: [
                                "値あり"
                            ]
                        }
                    ],

                    rules: [
                        {
                            id:
                                "test.custom",
                            sourceLabels: [
                                "独自項目"
                            ],
                            semanticTarget: {
                                entityName:
                                    "test",
                                fieldName:
                                    "custom",
                                displayName:
                                    "独自意味"
                            },
                            evidencePolicy: {
                                type:
                                    "has_samples"
                            }
                        }
                    ]
                });

        assert.equal(
            result.length,
            1
        );

        assert.equal(
            result[0]
                .candidate
                .fieldName,
            "custom"
        );
    }
);
