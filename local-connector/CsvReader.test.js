"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const CsvReader =
    require("./CsvReader");

test(
    "reads CSV into the common tabular document contract",
    async () => {
        const directory =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "risen-csv-"
                )
            );

        const filePath =
            path.join(
                directory,
                "support.csv"
            );

        await fs.writeFile(
            filePath,
            [
                "利用者名,居室番号,支援内容",
                '山田太郎,101,"食事, 見守り"',
                '佐藤花子,102,"声かけ"',
                ""
            ].join("\n"),
            "utf8"
        );

        const result =
            await new CsvReader().read(
                filePath
            );

        assert.deepStrictEqual(
            result,
            {
                sheetNames: ["csv"],
                sheets: [
                    {
                        sheetName: "csv",
                        rows: [
                            [
                                "利用者名",
                                "居室番号",
                                "支援内容"
                            ],
                            [
                                "山田太郎",
                                "101",
                                "食事, 見守り"
                            ],
                            [
                                "佐藤花子",
                                "102",
                                "声かけ"
                            ]
                        ]
                    }
                ]
            }
        );

        await fs.rm(
            directory,
            {
                recursive: true,
                force: true
            }
        );
    }
);

test(
    "supports quoted newlines escaped quotes and UTF-8 BOM",
    () => {
        const reader =
            new CsvReader();

        const rows =
            reader.parse(
                '\uFEFF利用者名,支援内容\r\n' +
                '山田太郎,"声かけ\r\n見守り"\r\n' +
                '佐藤花子,"""確認"""\r\n'
            );

        assert.deepStrictEqual(
            rows,
            [
                [
                    "利用者名",
                    "支援内容"
                ],
                [
                    "山田太郎",
                    "声かけ\r\n見守り"
                ],
                [
                    "佐藤花子",
                    '"確認"'
                ]
            ]
        );
    }
);

test(
    "rejects unterminated quoted fields",
    () => {
        assert.throws(
            () =>
                new CsvReader().parse(
                    '利用者名,"支援内容'
                ),
            /unterminated/
        );
    }
);
