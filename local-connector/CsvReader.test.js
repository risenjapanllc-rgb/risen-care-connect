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

test(
    "parses a tab-delimited source when the delimiter is explicit",
    () => {
        const rows =
            new CsvReader().parse(
                "利用者名\t利用日\r\n山田太郎\t2026-09-01\r\n",
                {
                    delimiter: "\t"
                }
            );

        assert.deepStrictEqual(
            rows,
            [
                [
                    "利用者名",
                    "利用日"
                ],
                [
                    "山田太郎",
                    "2026-09-01"
                ]
            ]
        );
    }
);

test(
    "keeps delimiters inside quoted fields as field content",
    () => {
        const rows =
            new CsvReader().parse(
                '利用者名\t備考\r\n山田太郎\t"送迎\tあり"\r\n',
                {
                    delimiter: "\t"
                }
            );

        assert.deepStrictEqual(
            rows,
            [
                [
                    "利用者名",
                    "備考"
                ],
                [
                    "山田太郎",
                    "送迎\tあり"
                ]
            ]
        );
    }
);

test(
    "rejects invalid explicit delimiters",
    () => {
        const reader =
            new CsvReader();

        for (const delimiter of [
            "",
            "::",
            "\"",
            "\r",
            "\n"
        ]) {
            assert.throws(
                () =>
                    reader.parse(
                        "a,b\n1,2\n",
                        { delimiter }
                    ),
                /CSV delimiter/
            );
        }
    }
);
