"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const RowSemanticResolver =
    require(
        "./RowSemanticResolver"
    );

test(
    "same source field receives different semantics from row context",
    () => {
        const result =
            RowSemanticResolver.resolve({
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
                            状態:
                                "1"
                        }
                    },
                    {
                        sourceEntityKey:
                            "sheet:0:row:3",
                        rowIndex: 3,
                        fields: {
                            行動:
                                "食事",
                            種類:
                                "食事量",
                            データ1:
                                "10",
                            データ2:
                                "食堂",
                            状態:
                                "1"
                        }
                    },
                    {
                        sourceEntityKey:
                            "sheet:0:row:4",
                        rowIndex: 4,
                        fields: {
                            行動:
                                "トイレ確認",
                            種類:
                                "尿",
                            データ1:
                                "普通量",
                            データ2:
                                "トイレ",
                            状態:
                                "1"
                        }
                    }
                ]
            });

        assert.equal(
            result.length,
            3
        );

        const temperature =
            result[0]
                .interpretations
                .find(item =>
                    item.sourceFieldName ===
                    "データ1"
                );

        const meal =
            result[1]
                .interpretations
                .find(item =>
                    item.sourceFieldName ===
                    "データ1"
                );

        const urine =
            result[2]
                .interpretations
                .find(item =>
                    item.sourceFieldName ===
                    "データ1"
                );

        assert.equal(
            temperature.semanticMeaning,
            "support_record.body_temperature"
        );

        assert.equal(
            meal.semanticMeaning,
            "support_record.meal_intake_ratio"
        );

        assert.equal(
            urine.semanticMeaning,
            "support_record.urine_amount_category"
        );
    }
);

test(
    "health row resolves measurement and location semantics",
    () => {
        const result =
            RowSemanticResolver.resolve({
                sourceFields: [
                    {
                        rowIndex: 10,
                        fields: {
                            行動:
                                "健康管理",
                            種類:
                                "血圧上",
                            データ1:
                                "119",
                            データ2:
                                "居室"
                        }
                    },
                    {
                        rowIndex: 11,
                        fields: {
                            行動:
                                "健康管理",
                            種類:
                                "血圧下",
                            データ1:
                                "78",
                            データ2:
                                "居室"
                        }
                    },
                    {
                        rowIndex: 12,
                        fields: {
                            行動:
                                "健康管理",
                            種類:
                                "脈拍",
                            データ1:
                                "66",
                            データ2:
                                "居室"
                        }
                    }
                ]
            });

        assert.deepEqual(
            result.map(
                item =>
                    item.interpretations[0]
                        .semanticMeaning
            ),
            [
                "support_record.systolic_blood_pressure",
                "support_record.diastolic_blood_pressure",
                "support_record.pulse_rate"
            ]
        );

        for (const item of result) {
            assert.equal(
                item.interpretations[1]
                    .semanticMeaning,
                "support_record.record_location"
            );
        }
    }
);

test(
    "sleep row resolves location and sleep state",
    () => {
        const result =
            RowSemanticResolver.resolve({
                sourceFields: [
                    {
                        rowIndex: 20,
                        fields: {
                            行動:
                                "睡眠状況",
                            種類:
                                "熟睡",
                            データ2:
                                "居室",
                            詳細:
                                "熟睡",
                            状態:
                                "3"
                        }
                    }
                ]
            });

        assert.equal(
            result.length,
            1
        );

        assert.deepEqual(
            result[0]
                .interpretations
                .map(item =>
                    item.semanticMeaning
                ),
            [
                "support_record.record_location",
                "support_record.sleep_state"
            ]
        );
    }
);

test(
    "unknown row and source status code remain unresolved",
    () => {
        const result =
            RowSemanticResolver.resolve({
                sourceFields: [
                    {
                        rowIndex: 30,
                        fields: {
                            行動:
                                "未知",
                            種類:
                                "未知",
                            データ1:
                                "999",
                            状態:
                                "503"
                        }
                    }
                ]
            });

        assert.deepEqual(
            result,
            []
        );
    }
);
