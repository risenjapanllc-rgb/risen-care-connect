"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const CsvIntakeInspector =
    require("./CsvIntakeInspector");

test(
    "inspects UTF-8 source evidence without assigning semantic meaning",
    async () => {
        const directory =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "risen-csv-intake-"
                )
            );

        try {
            const filePath =
                path.join(
                    directory,
                    "unknown.csv"
                );

            const content =
                "利用者名,利用日\n山田太郎,2026-09-01\n";

            await fs.writeFile(
                filePath,
                content,
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.strictEqual(
                result.encoding,
                "utf-8"
            );

            assert.strictEqual(
                result.encodingConfidence,
                "unique"
            );

            assert.deepStrictEqual(
                result.compatibleEncodings,
                ["utf-8"]
            );

            assert.strictEqual(
                result.bom,
                null
            );

            assert.strictEqual(
                result.byteSize,
                Buffer.byteLength(
                    content,
                    "utf8"
                )
            );

            assert.strictEqual(
                result.text,
                content
            );

            assert.strictEqual(
                Object.hasOwn(
                    result,
                    "semanticType"
                ),
                false
            );

            assert.strictEqual(
                Object.hasOwn(
                    result,
                    "meanings"
                ),
                false
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "recognizes Shift_JIS when it is the unique compatible candidate",
    () => {
        const buffer =
            Buffer.from([
                0x96, 0xbc,
                0x91, 0x4f,
                0x2c,
                0x93, 0xfa,
                0x95, 0x74,
                0x0d, 0x0a
            ]);

        const result =
            new CsvIntakeInspector()
                .inspectEncoding(buffer);

        assert.deepStrictEqual(
            result,
            {
                selected: "shift_jis",
                confidence: "unique",
                compatible: [
                    "shift_jis"
                ]
            }
        );
    }
);

test(
    "preserves ambiguity for ASCII-only CSV bytes",
    () => {
        const buffer =
            Buffer.from(
                "name,date\r\nTaro,2026-09-01\r\n",
                "ascii"
            );

        const result =
            new CsvIntakeInspector()
                .inspectEncoding(buffer);

        assert.deepStrictEqual(
            result,
            {
                selected: "utf-8",
                confidence: "ambiguous",
                compatible: [
                    "utf-8",
                    "shift_jis",
                    "euc-jp"
                ]
            }
        );
    }
);

test(
    "uses a UTF-8 BOM as explicit encoding evidence",
    async () => {
        const directory =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "risen-csv-intake-"
                )
            );

        try {
            const filePath =
                path.join(
                    directory,
                    "bom.csv"
                );

            const content =
                "\uFEFF列A,列B\n値A,値B\n";

            await fs.writeFile(
                filePath,
                content,
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.strictEqual(
                result.encoding,
                "utf-8"
            );

            assert.strictEqual(
                result.encodingConfidence,
                "bom"
            );

            assert.strictEqual(
                result.bom,
                "utf-8"
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "rejects a missing CSV file path",
    async () => {
        await assert.rejects(
            () =>
                new CsvIntakeInspector()
                    .inspect(""),
            /CSV file is required/
        );
    }
);

test(
    "observes comma-delimited row structure",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectDelimiter(
                    "利用者名,利用日,備考\r\n" +
                    "山田太郎,2026-09-01,通常\r\n" +
                    "佐藤花子,2026-09-02,送迎あり\r\n"
                );

        assert.strictEqual(
            result.selected,
            ","
        );

        assert.strictEqual(
            result.confidence,
            "structural"
        );

        const comma =
            result.candidates.find(
                candidate =>
                    candidate.delimiter === ","
            );

        assert.deepStrictEqual(
            comma,
            {
                delimiter: ",",
                rowCount: 3,
                columnCounts: [3, 3, 3],
                modeColumnCount: 3,
                consistentRowCount: 3,
                consistencyRatio: 1
            }
        );
    }
);

test(
    "observes tab-delimited row structure",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectDelimiter(
                    "利用者名\t利用日\r\n" +
                    "山田太郎\t2026-09-01\r\n"
                );

        assert.strictEqual(
            result.selected,
            "\t"
        );

        assert.strictEqual(
            result.confidence,
            "structural"
        );
    }
);

test(
    "does not treat consistent single-column parses as delimiter evidence",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectDelimiter(
                    "利用者名\r\n山田太郎\r\n"
                );

        assert.strictEqual(
            result.selected,
            null
        );

        assert.strictEqual(
            result.confidence,
            "undetermined"
        );
    }
);

test(
    "preserves delimiter ambiguity instead of choosing by candidate order",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectDelimiter(
                    "a,b;c\r\n1,2;3\r\n"
                );

        assert.strictEqual(
            result.selected,
            null
        );

        assert.strictEqual(
            result.confidence,
            "ambiguous"
        );
    }
);
