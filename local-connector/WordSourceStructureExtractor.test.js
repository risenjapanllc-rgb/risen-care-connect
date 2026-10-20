"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const WordSourceStructureExtractor =
    require(
        "./WordSourceStructureExtractor"
    );

test(
    "extracts a two-column Word table into common semantic source contracts",
    () => {
        const extractor =
            new WordSourceStructureExtractor();

        const result =
            extractor.extractKeyValueTable({
                tableIndex: 2,
                rows: [
                    [
                        "入院",
                        "辻幸一さん【入院日】4月17日"
                    ],
                    [
                        "外泊",
                        "なし"
                    ],
                    [
                        "通院状況\n（本日）",
                        "河津順子さん【病院】ともつ耳鼻科"
                    ]
                ]
            });

        assert.deepStrictEqual(
            result.fieldDefinitions,
            [
                {
                    sourceFieldKey:
                        "word:table:2:row:0",
                    headerLabel:
                        "入院",
                    tableIndex: 2,
                    rowIndex: 0,
                    labelCellIndex: 0,
                    valueCellIndex: 1
                },
                {
                    sourceFieldKey:
                        "word:table:2:row:1",
                    headerLabel:
                        "外泊",
                    tableIndex: 2,
                    rowIndex: 1,
                    labelCellIndex: 0,
                    valueCellIndex: 1
                },
                {
                    sourceFieldKey:
                        "word:table:2:row:2",
                    headerLabel:
                        "通院状況 (本日)",
                    tableIndex: 2,
                    rowIndex: 2,
                    labelCellIndex: 0,
                    valueCellIndex: 1
                }
            ]
        );

        assert.deepStrictEqual(
            result.sourceEntities[0]
                .valuesBySourceFieldKey,
            {
                "word:table:2:row:0":
                    "辻幸一さん【入院日】4月17日",
                "word:table:2:row:1":
                    "なし",
                "word:table:2:row:2":
                    "河津順子さん【病院】ともつ耳鼻科"
            }
        );

        assert.deepStrictEqual(
            result.sourceFields[0].fields,
            {
                "入院":
                    "辻幸一さん【入院日】4月17日",
                "外泊":
                    "なし",
                "通院状況 (本日)":
                    "河津順子さん【病院】ともつ耳鼻科"
            }
        );
    }
);

test(
    "extracts Mammoth table html including th cells and merged headings",
    () => {
        const extractor =
            new WordSourceStructureExtractor();

        const tables =
            extractor.extractTablesFromMammothHtml(
                [
                    "<table>",
                    "<thead>",
                    "<tr>",
                    '<th colspan="2">',
                    "<p><strong>職員の勤務体制</strong></p>",
                    "</th>",
                    "</tr>",
                    "<tr>",
                    "<th>",
                    "<p><strong>早出</strong></p>",
                    "</th>",
                    "<th>",
                    "<p>康本将史、尾田瑞希</p>",
                    "</th>",
                    "</tr>",
                    "<tr>",
                    "<th>",
                    "<p><strong>日勤</strong></p>",
                    "<p><strong>（登録含）</strong></p>",
                    "</th>",
                    "<th>",
                    "<p>蓬莱元次、福島真司</p>",
                    "</th>",
                    "</tr>",
                    "</thead>",
                    "</table>"
                ].join("")
            );

        assert.strictEqual(
            tables.length,
            1
        );

        assert.deepStrictEqual(
            tables[0],
            {
                tableIndex: 0,
                rows: [
                    [
                        {
                            text:
                                "職員の勤務体制",
                            colspan: 2,
                            rowspan: 1
                        }
                    ],
                    [
                        {
                            text:
                                "早出",
                            colspan: 1,
                            rowspan: 1
                        },
                        {
                            text:
                                "康本将史、尾田瑞希",
                            colspan: 1,
                            rowspan: 1
                        }
                    ],
                    [
                        {
                            text:
                                "日勤 (登録含)",
                            colspan: 1,
                            rowspan: 1
                        },
                        {
                            text:
                                "蓬莱元次、福島真司",
                            colspan: 1,
                            rowspan: 1
                        }
                    ]
                ]
            }
        );
    }
);

test(
    "preserves Mammoth rowspan metadata",
    () => {
        const extractor =
            new WordSourceStructureExtractor();

        const tables =
            extractor.extractTablesFromMammothHtml(
                [
                    "<table>",
                    "<tr>",
                    '<th rowspan="2">',
                    "<p>記録者</p>",
                    "</th>",
                    "<th><p>小柳 真子</p></th>",
                    "</tr>",
                    "<tr>",
                    "<th><p></p></th>",
                    "</tr>",
                    "</table>"
                ].join("")
            );

        assert.strictEqual(
            tables[0].rows[0][0].rowspan,
            2
        );
    }
);

test(
    "extracts common key-value contracts from multiple Word tables without document-specific table numbers",
    () => {
        const extractor =
            new WordSourceStructureExtractor();

        const html = [
            "<table>",
            "<tr>",
            "<th></th>",
            "<th>在籍数</th>",
            "<th>入院</th>",
            "</tr>",
            "<tr>",
            "<th>男</th>",
            "<th>19</th>",
            "<th>3</th>",
            "</tr>",
            "</table>",

            "<table>",
            "<tr>",
            "<th>入院</th>",
            "<th>入院者情報</th>",
            "</tr>",
            "<tr>",
            "<th>外泊</th>",
            "<th>なし</th>",
            "</tr>",
            "</table>",

            "<table>",
            "<tr>",
            '<th colspan="2">職員の勤務体制</th>',
            "</tr>",
            "<tr>",
            "<th>早出</th>",
            "<th>職員A、職員B</th>",
            "</tr>",
            "<tr>",
            "<th>日勤</th>",
            "<th>職員C、職員D</th>",
            "</tr>",
            "</table>",

            "<table>",
            "<tr>",
            "<th>連絡事項</th>",
            "</tr>",
            "<tr>",
            "<th>長文本文</th>",
            "</tr>",
            "</table>",

            "<table>",
            "<tr>",
            "<th>明日の予定等</th>",
            "<th>入浴、リハビリ</th>",
            "</tr>",
            "</table>"
        ].join("");

        const result =
            extractor.extractKeyValueContractsFromMammothHtml(
                html
            );

        assert.deepStrictEqual(
            result.fieldDefinitions.map(
                field =>
                    field.headerLabel
            ),
            [
                "入院",
                "外泊",
                "早出",
                "日勤",
                "明日の予定等"
            ]
        );

        assert.deepStrictEqual(
            result.fieldDefinitions.map(
                field =>
                    field.sourceFieldKey
            ),
            [
                "word:table:1:row:0",
                "word:table:1:row:1",
                "word:table:2:row:1",
                "word:table:2:row:2",
                "word:table:4:row:0"
            ]
        );

        assert.strictEqual(
            result.sourceEntities.length,
            3
        );

        assert.deepStrictEqual(
            result.sourceEntities.map(
                entity =>
                    entity.tableIndex
            ),
            [
                1,
                2,
                4
            ]
        );
    }
);
