"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SemanticEvidenceBuilder =
    require("./SemanticEvidenceBuilder");

test(
    "tabular evidence keeps sample values and neighboring fields",
    () => {
        const builder =
            new SemanticEvidenceBuilder();

        const result =
            builder.buildForTabular({
                sourceType: "csv",
                documentType:
                    "support_record",

                fieldDefinitions: [
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",

                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 2,
                        headerLabel: "氏名"
                    }
                ],

                sourceFields: [
                    {
                        fields: {
                            ID: "1001",
                            日時:
                                "2026-04-21 09:00",
                            氏名: "山田 太郎",
                            処遇内容:
                                "作業支援",
                            記入者:
                                "支援員A"
                        }
                    },

                    {
                        fields: {
                            ID: "1002",
                            日時:
                                "2026-04-21 10:00",
                            氏名: "佐藤 花子",
                            処遇内容:
                                "食事支援",
                            記入者:
                                "支援員B"
                        }
                    }
                ]
            });

        assert.equal(
            result.length,
            1
        );

        assert.deepEqual(
            result[0].sampleValues,
            [
                "山田 太郎",
                "佐藤 花子"
            ]
        );

        assert.ok(
            result[0]
                .neighboringFields
                .includes("記入者")
        );

        assert.ok(
            result[0]
                .neighboringFields
                .includes("処遇内容")
        );
    }
);

test(
    "word evidence retains document text for semantic reasoning",
    () => {
        const builder =
            new SemanticEvidenceBuilder();

        const result =
            builder.buildForWord({
                documentType:
                    "support_record",

                text:
                    "生活介護 日勤日誌\n利用者氏名 山田太郎\n支援内容 食事支援"
            });

        assert.equal(
            result.sourceType,
            "word"
        );

        assert.equal(
            result.lineCount,
            3
        );

        assert.match(
            result.documentText,
            /利用者氏名/
        );

        assert.deepEqual(
            result.lines,
            [
                "生活介護 日勤日誌",
                "利用者氏名 山田太郎",
                "支援内容 食事支援"
            ]
        );
    }
);
