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
    "状態 with source record context resolves as group state code",
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
                            ],
                            neighboringFields: [
                                "日時",
                                "氏名",
                                "処遇内容",
                                "記入者",
                                "種類"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            1
        );

        assert.equal(
            result[0].status,
            "automatic_candidate"
        );

        assert.equal(
            result[0].humanConfirmationRequired,
            false
        );

        assert.equal(
            result[0].candidate.entityName,
            "source_record"
        );

        assert.equal(
            result[0].candidate.fieldName,
            "group_state_code"
        );
    }
);

test(
    "generic 状態 without source record context remains unresolved",
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

test(
    "automatic catalog rules return automatic candidates without human confirmation",
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
                        }
                    ]
                });

        assert.equal(
            result.length,
            1
        );

        assert.equal(
            result[0].status,
            "automatic_candidate"
        );

        assert.equal(
            result[0].humanConfirmationRequired,
            false
        );
    }
);


test(
    "externally supplied review rules remain contextual candidates",
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
                                "test.review",
                            sourceLabels: [
                                "独自項目"
                            ],
                            semanticTarget: {
                                entityName:
                                    "test",
                                fieldName:
                                    "review",
                                displayName:
                                    "独自意味"
                            },
                            evidencePolicy: {
                                type:
                                    "has_samples"
                            },
                            resolutionPolicy:
                                "review"
                        }
                    ]
                });

        assert.equal(
            result.length,
            1
        );

        assert.equal(
            result[0].status,
            "contextual_candidate"
        );

        assert.equal(
            result[0].humanConfirmationRequired,
            true
        );
    }
);

test(
    "修正 with binary source values resolves automatically as source revision flag",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "修正"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            sampleValues: [
                                "0.0",
                                "1.0"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            1
        );

        assert.equal(
            result[0].status,
            "automatic_candidate"
        );

        assert.equal(
            result[0].humanConfirmationRequired,
            false
        );

        assert.equal(
            result[0].candidate.entityName,
            "source_record"
        );

        assert.equal(
            result[0].candidate.fieldName,
            "revision_flag"
        );
    }
);

test(
    "修正 with an unexpected source value does not resolve automatically",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:23",
                            headerLabel:
                                "修正"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:23",
                            sampleValues: [
                                "0.0",
                                "1.0",
                                "999"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            0
        );
    }
);

test(
    "ID with integer values and record context resolves automatically as source record id",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "ID"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",

                            sampleValues: [
                                "4163476",
                                "4163477",
                                "4163478",
                                "4163479",
                                "4163480"
                            ],

                            neighboringFields: [
                                "日時",
                                "氏名",
                                "処遇内容",
                                "記入者",
                                "種類",
                                "データ2",
                                "気温",
                                "天気"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            1
        );

        assert.equal(
            result[0].status,
            "automatic_candidate"
        );

        assert.equal(
            result[0].humanConfirmationRequired,
            false
        );

        assert.equal(
            result[0].candidate.entityName,
            "source_record"
        );

        assert.equal(
            result[0].candidate.fieldName,
            "record_id"
        );
    }
);

test(
    "generic ID without sufficient record context does not resolve as source record id",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "ID"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",

                            sampleValues: [
                                "1001",
                                "1002",
                                "1003"
                            ],

                            neighboringFields: [
                                "氏名",
                                "住所"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            0
        );
    }
);

test(
    "ID with non integer values does not resolve as source record id",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "ID"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",

                            sampleValues: [
                                "ABC001",
                                "ABC002",
                                "ABC003"
                            ],

                            neighboringFields: [
                                "日時",
                                "氏名",
                                "処遇内容",
                                "記入者",
                                "種類"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            0
        );
    }
);

test(
    "保護 with binary values and source record context resolves as protection flag",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "保護"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            sampleValues: [
                                "1.0"
                            ],
                            neighboringFields: [
                                "ID",
                                "日時",
                                "氏名",
                                "処遇内容",
                                "記入者",
                                "種類"
                            ]
                        }
                    ]
                });

        assert.equal(
            result.length,
            1
        );

        assert.equal(
            result[0].status,
            "automatic_candidate"
        );

        assert.equal(
            result[0].humanConfirmationRequired,
            false
        );

        assert.equal(
            result[0].candidate.entityName,
            "source_record"
        );

        assert.equal(
            result[0].candidate.fieldName,
            "protection_flag"
        );
    }
);

test(
    "generic 保護 without source record context remains unresolved",
    () => {
        const result =
            SemanticEvidenceResolver
                .resolve({
                    fieldDefinitions: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            headerLabel:
                                "保護"
                        }
                    ],

                    semanticEvidence: [
                        {
                            sourceFieldKey:
                                "sheet:0:column:0",
                            sampleValues: [
                                "1.0"
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
