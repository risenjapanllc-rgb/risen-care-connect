"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    resolveSubjectContext
} =
    require("./ContextResolver");

test(
    "ambiguous 氏名 becomes user.name candidate when document has separate staff field and source-value evidence",
    () => {
        const result =
            resolveSubjectContext({
                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        headerLabel: "ID"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        headerLabel: "氏名"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:3",
                        headerLabel: "処遇内容"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:4",
                        headerLabel: "記入者"
                    }
                ],

                semanticEvidence: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        headerLabel: "氏名",
                        sampleValues: [
                            "池田くみ子",
                            "小林桃子",
                            "高橋直人"
                        ],
                        neighboringFields: [
                            "ID",
                            "処遇内容",
                            "記入者"
                        ]
                    }
                ]
            });

        const candidate =
            result.contextualCandidates.find(
                item =>
                    item.sourceFieldKey ===
                    "sheet:0:column:2"
            );

        assert.ok(candidate);

        assert.deepEqual(
            candidate.candidate,
            {
                entityName: "user",
                fieldName: "name",
                displayName: "利用者名"
            }
        );

        assert.equal(
            candidate.status,
            "contextual_candidate"
        );

        assert.equal(
            candidate.humanConfirmationRequired,
            true
        );

        assert.equal(
            candidate.reason,
            "separate_staff_field_and_source_values_support_user_name"
        );
    }
);

test(
    "氏名 alone is not promoted to user.name without enough context",
    () => {
        const result =
            resolveSubjectContext({
                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        headerLabel: "氏名"
                    }
                ],

                semanticEvidence: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        headerLabel: "氏名",
                        sampleValues: [
                            "山田太郎"
                        ]
                    }
                ]
            });

        assert.equal(
            result.contextualCandidates.length,
            0
        );
    }
);

test(
    "support record evidence proposes temperature weather presence and activity semantics",
    () => {
        const result =
            resolveSubjectContext({
                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:15",
                        headerLabel:
                            "気温"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:16",
                        headerLabel:
                            "天気"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:22",
                        headerLabel:
                            "在園状態"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:26",
                        headerLabel:
                            "行動"
                    }
                ],

                semanticEvidence: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:15",
                        headerLabel:
                            "気温",
                        sampleValues: [
                            "23.8",
                            "23.7",
                            "22.2"
                        ]
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:16",
                        headerLabel:
                            "天気",
                        sampleValues: [
                            "晴",
                            "曇",
                            "雨"
                        ]
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:22",
                        headerLabel:
                            "在園状態",
                        sampleValues: [
                            "在中",
                            "不在"
                        ]
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:26",
                        headerLabel:
                            "行動",
                        sampleValues: [
                            "睡眠状況",
                            "付添移動",
                            "トイレ確認",
                            "失禁"
                        ]
                    }
                ]
            });

        const byField =
            new Map(
                result.contextualCandidates
                    .map(item => [
                        item.sourceFieldKey,
                        `${item.candidate.entityName}.${item.candidate.fieldName}`
                    ])
            );

        assert.equal(
            byField.get(
                "sheet:0:column:15"
            ),
            "support_record.temperature"
        );

        assert.equal(
            byField.get(
                "sheet:0:column:16"
            ),
            "support_record.weather"
        );

        assert.equal(
            byField.get(
                "sheet:0:column:22"
            ),
            "support_record.presence_status"
        );

        assert.equal(
            byField.get(
                "sheet:0:column:26"
            ),
            "support_record.activity"
        );
    }
);

test(
    "generic 状態 remains unresolved without semantic evidence strong enough to identify its meaning",
    () => {
        const result =
            resolveSubjectContext({
                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:24",
                        headerLabel:
                            "状態"
                    }
                ],

                semanticEvidence: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:24",
                        headerLabel:
                            "状態",
                        sampleValues: [
                            "1",
                            "3",
                            "503",
                            "501",
                            "0"
                        ]
                    }
                ]
            });

        const candidate =
            result.contextualCandidates.find(
                item =>
                    item.sourceFieldKey ===
                    "sheet:0:column:24"
            );

        assert.equal(
            candidate,
            undefined
        );
    }
);

test(
    "context resolver accepts row source fields without changing existing semantic resolution",
    () => {
        const result =
            resolveSubjectContext({
                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:15",
                        headerLabel:
                            "気温"
                    }
                ],

                semanticEvidence: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:15",
                        headerLabel:
                            "気温",
                        sampleValues: [
                            "23.8",
                            "24.1"
                        ]
                    }
                ],

                sourceFields: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        sheetIndex: 0,
                        sheetName: "CSV",
                        rowIndex: 2,
                        fields: {
                            種類:
                                "バイタル",
                            データ1:
                                "36.5",
                            気温:
                                "23.8"
                        }
                    }
                ]
            });

        const candidate =
            result.contextualCandidates
                .find(item =>
                    item.sourceFieldKey ===
                    "sheet:0:column:15"
                );

        assert.ok(candidate);

        assert.equal(
            candidate.candidate.entityName,
            "support_record"
        );

        assert.equal(
            candidate.candidate.fieldName,
            "temperature"
        );
    }
);

test(
    "context resolver returns row semantic summary separately from column candidates",
    () => {
        const result =
            resolveSubjectContext({
                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:15",
                        headerLabel:
                            "気温"
                    }
                ],

                semanticEvidence: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:15",
                        headerLabel:
                            "気温",
                        sampleValues: [
                            "23.8",
                            "24.1"
                        ]
                    }
                ],

                sourceFields: [
                    {
                        sourceEntityKey:
                            "sheet:0:row:2",
                        rowIndex: 2,
                        fields: {
                            行動:
                                "健康管理",
                            種類:
                                "体温",
                            データ1:
                                "36.5",
                            データ2:
                                "廊下",
                            気温:
                                "23.8",
                            状態:
                                "1"
                        }
                    }
                ]
            });

        const columnCandidate =
            result.contextualCandidates
                .find(item =>
                    item.sourceFieldKey ===
                    "sheet:0:column:15"
                );

        assert.ok(
            columnCandidate
        );

        assert.equal(
            columnCandidate
                .candidate
                .fieldName,
            "temperature"
        );

        assert.ok(
            Array.isArray(
                result.rowSemanticSummary
            )
        );

        assert.equal(
            result.rowSemanticSummary.length,
            2
        );

        const bodyTemperature =
            result.rowSemanticSummary
                .find(item =>
                    item.semanticMeaning ===
                    "support_record.body_temperature"
                );

        assert.ok(
            bodyTemperature
        );

        assert.equal(
            bodyTemperature.displayName,
            "体温"
        );

        assert.equal(
            bodyTemperature.count,
            1
        );

        assert.equal(
            result.contextualCandidates
                .some(item =>
                    item.candidate
                        ?.fieldName ===
                    "body_temperature"
                ),
            false
        );
    }
);
