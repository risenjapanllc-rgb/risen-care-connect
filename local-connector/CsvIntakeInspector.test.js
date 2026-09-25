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

test(
    "observes consistent non-blank row shape",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectRowShape([
                    ["A", "B", "C"],
                    ["1", "2", "3"],
                    ["4", "5", "6"]
                ]);

        assert.deepStrictEqual(
            result,
            {
                rowCount: 3,
                nonBlankRowCount: 3,
                blankRowCount: 0,
                columnCountFrequencies: [
                    {
                        columnCount: 3,
                        rowCount: 3
                    }
                ],
                modeColumnCount: 3,
                consistentRowCount: 3,
                consistencyRatio: 1,
                shapeConfidence: "structural",
                irregularRows: []
            }
        );
    }
);

test(
    "observes blank rows without using them in structural consistency",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectRowShape([
                    ["A", "B"],
                    ["1", "2"],
                    [""],
                    ["", ""],
                    ["3", "4"]
                ]);

        assert.deepStrictEqual(
            result,
            {
                rowCount: 5,
                nonBlankRowCount: 3,
                blankRowCount: 2,
                columnCountFrequencies: [
                    {
                        columnCount: 2,
                        rowCount: 3
                    }
                ],
                modeColumnCount: 2,
                consistentRowCount: 3,
                consistencyRatio: 1,
                shapeConfidence: "structural",
                irregularRows: []
            }
        );
    }
);

test(
    "reports irregular non-blank rows by physical row index",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectRowShape([
                    ["A", "B", "C"],
                    ["1", "2", "3"],
                    ["TOTAL", "100"],
                    ["4", "5", "6"]
                ]);

        assert.deepStrictEqual(
            result,
            {
                rowCount: 4,
                nonBlankRowCount: 4,
                blankRowCount: 0,
                columnCountFrequencies: [
                    {
                        columnCount: 3,
                        rowCount: 3
                    },
                    {
                        columnCount: 2,
                        rowCount: 1
                    }
                ],
                modeColumnCount: 3,
                consistentRowCount: 3,
                consistencyRatio: 0.75,
                shapeConfidence: "structural",
                irregularRows: [
                    {
                        rowIndex: 2,
                        columnCount: 2
                    }
                ]
            }
        );
    }
);

test(
    "preserves row-shape ambiguity when column-count modes are tied",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectRowShape([
                    ["A", "B", "C"],
                    ["1", "2", "3"],
                    ["X", "Y"],
                    ["4", "5"]
                ]);

        assert.strictEqual(
            result.modeColumnCount,
            null
        );

        assert.strictEqual(
            result.consistentRowCount,
            2
        );

        assert.strictEqual(
            result.consistencyRatio,
            0.5
        );

        assert.strictEqual(
            result.shapeConfidence,
            "ambiguous"
        );

        assert.deepStrictEqual(
            result.irregularRows,
            []
        );
    }
);

test(
    "reports undetermined row shape when every row is blank",
    () => {
        const result =
            new CsvIntakeInspector()
                .inspectRowShape([
                    [""],
                    ["", ""],
                    [""]
                ]);

        assert.deepStrictEqual(
            result,
            {
                rowCount: 3,
                nonBlankRowCount: 0,
                blankRowCount: 3,
                columnCountFrequencies: [],
                modeColumnCount: null,
                consistentRowCount: 0,
                consistencyRatio: 0,
                shapeConfidence: "undetermined",
                irregularRows: []
            }
        );
    }
);

test(
    "includes row-shape evidence when delimiter is structurally selected",
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
                    "row-shape.csv"
                );

            await fs.writeFile(
                filePath,
                "name,code\nAlice,A001\nBob,B002\n",
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.deepStrictEqual(
                result.rowShape,
                {
                    rowCount: 3,
                    nonBlankRowCount: 3,
                    blankRowCount: 0,
                    columnCountFrequencies: [
                        {
                            columnCount: 2,
                            rowCount: 3
                        }
                    ],
                    modeColumnCount: 2,
                    consistentRowCount: 3,
                    consistencyRatio: 1,
                    shapeConfidence: "structural",
                    irregularRows: []
                }
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
    "does not infer row shape when delimiter is unresolved",
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
                    "unresolved.csv"
                );

            await fs.writeFile(
                filePath,
                "alpha\nbeta\ngamma\n",
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.strictEqual(
                result.delimiter,
                null
            );

            assert.strictEqual(
                result.rowShape,
                null
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
    "observes the first structurally matching non-blank row as a header candidate",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["name", "code", "date"],
            ["Alice", "A001", "2026-09-01"],
            ["Bob", "B002", "2026-09-02"]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        assert.deepStrictEqual(
            inspector.inspectHeaderCandidate(
                rows,
                rowShape
            ),
            {
                rowIndex: 0,
                columnCount: 3,
                confidence: "candidate"
            }
        );
    }
);

test(
    "preserves physical row index when blank rows precede the header candidate",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            [""],
            ["", ""],
            ["name", "code"],
            ["Alice", "A001"]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        assert.deepStrictEqual(
            inspector.inspectHeaderCandidate(
                rows,
                rowShape
            ),
            {
                rowIndex: 2,
                columnCount: 2,
                confidence: "candidate"
            }
        );
    }
);

test(
    "does not produce a header candidate when row shape is ambiguous",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["A", "B", "C"],
            ["1", "2", "3"],
            ["X", "Y"],
            ["4", "5"]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        assert.strictEqual(
            inspector.inspectHeaderCandidate(
                rows,
                rowShape
            ),
            null
        );
    }
);

test(
    "does not produce a header candidate when every row is blank",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            [""],
            ["", ""]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        assert.strictEqual(
            inspector.inspectHeaderCandidate(
                rows,
                rowShape
            ),
            null
        );
    }
);

test(
    "does not skip an irregular first non-blank row to search for a header-like row",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["Report generated 2026-09-25"],
            ["name", "code", "date"],
            ["Alice", "A001", "2026-09-01"],
            ["Bob", "B002", "2026-09-02"]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        assert.strictEqual(
            rowShape.modeColumnCount,
            3
        );

        assert.strictEqual(
            inspector.inspectHeaderCandidate(
                rows,
                rowShape
            ),
            null
        );
    }
);

test(
    "includes a header candidate when delimiter and row shape are structurally resolved",
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
                    "header-candidate.csv"
                );

            await fs.writeFile(
                filePath,
                "name,code\nAlice,A001\nBob,B002\n",
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.deepStrictEqual(
                result.headerCandidate,
                {
                    rowIndex: 0,
                    columnCount: 2,
                    confidence: "candidate"
                }
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
    "does not infer a header candidate when delimiter is unresolved",
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
                    "header-unresolved.csv"
                );

            await fs.writeFile(
                filePath,
                "alpha\nbeta\ngamma\n",
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.strictEqual(
                result.delimiter,
                null
            );

            assert.strictEqual(
                result.rowShape,
                null
            );

            assert.strictEqual(
                result.headerCandidate,
                null
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
    "observes physical columns from a confirmed header candidate",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["name", "code"],
            ["Alice", "A001"],
            ["Bob", "B002"]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        const headerCandidate =
            inspector.inspectHeaderCandidate(
                rows,
                rowShape
            );

        assert.deepStrictEqual(
            inspector.inspectColumnObservations(
                rows,
                rowShape,
                headerCandidate
            ),
            [
                {
                    columnIndex: 0,
                    headerValue: "name",
                    nonBlankValueCount: 2,
                    blankValueCount: 0,
                    missingCellCount: 0,
                    sampleValues: [
                        "Alice",
                        "Bob"
                    ]
                },
                {
                    columnIndex: 1,
                    headerValue: "code",
                    nonBlankValueCount: 2,
                    blankValueCount: 0,
                    missingCellCount: 0,
                    sampleValues: [
                        "A001",
                        "B002"
                    ]
                }
            ]
        );
    }
);

test(
    "observes blank values without trimming source content",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["name", "code"],
            ["Alice", ""],
            [" ", "A002"],
            ["Bob", ""]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        const headerCandidate =
            inspector.inspectHeaderCandidate(
                rows,
                rowShape
            );

        assert.deepStrictEqual(
            inspector.inspectColumnObservations(
                rows,
                rowShape,
                headerCandidate
            ),
            [
                {
                    columnIndex: 0,
                    headerValue: "name",
                    nonBlankValueCount: 3,
                    blankValueCount: 0,
                    missingCellCount: 0,
                    sampleValues: [
                        "Alice",
                        " ",
                        "Bob"
                    ]
                },
                {
                    columnIndex: 1,
                    headerValue: "code",
                    nonBlankValueCount: 1,
                    blankValueCount: 2,
                    missingCellCount: 0,
                    sampleValues: [
                        "A002"
                    ]
                }
            ]
        );
    }
);

test(
    "preserves duplicate sample values in source order",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["status"],
            ["active"],
            ["active"],
            ["inactive"]
        ];

        const rowShape = {
            shapeConfidence: "structural",
            modeColumnCount: 1
        };

        const headerCandidate = {
            rowIndex: 0,
            columnCount: 1,
            confidence: "candidate"
        };

        assert.deepStrictEqual(
            inspector.inspectColumnObservations(
                rows,
                rowShape,
                headerCandidate
            ),
            [
                {
                    columnIndex: 0,
                    headerValue: "status",
                    nonBlankValueCount: 3,
                    blankValueCount: 0,
                    missingCellCount: 0,
                    sampleValues: [
                        "active",
                        "active",
                        "inactive"
                    ]
                }
            ]
        );
    }
);

test(
    "limits sample values without changing observation counts",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["value"],
            ["A"],
            ["B"],
            ["C"],
            ["D"]
        ];

        const rowShape = {
            shapeConfidence: "structural",
            modeColumnCount: 1
        };

        const headerCandidate = {
            rowIndex: 0,
            columnCount: 1,
            confidence: "candidate"
        };

        assert.deepStrictEqual(
            inspector.inspectColumnObservations(
                rows,
                rowShape,
                headerCandidate,
                { sampleLimit: 2 }
            ),
            [
                {
                    columnIndex: 0,
                    headerValue: "value",
                    nonBlankValueCount: 4,
                    blankValueCount: 0,
                    missingCellCount: 0,
                    sampleValues: [
                        "A",
                        "B"
                    ]
                }
            ]
        );
    }
);

test(
    "does not observe columns without a header candidate",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["alpha", "beta"],
            ["A", "B"]
        ];

        const rowShape =
            inspector.inspectRowShape(rows);

        assert.strictEqual(
            inspector.inspectColumnObservations(
                rows,
                rowShape,
                null
            ),
            null
        );
    }
);

test(
    "distinguishes an empty cell from a physically missing cell",
    () => {
        const inspector =
            new CsvIntakeInspector();

        const rows = [
            ["name", "code"],
            ["Alice", "A001"],
            ["Bob"],
            ["Carol", ""],
            ["Dave", "D004"]
        ];

        const rowShape = {
            shapeConfidence: "structural",
            modeColumnCount: 2
        };

        const headerCandidate = {
            rowIndex: 0,
            columnCount: 2,
            confidence: "candidate"
        };

        assert.deepStrictEqual(
            inspector.inspectColumnObservations(
                rows,
                rowShape,
                headerCandidate
            ),
            [
                {
                    columnIndex: 0,
                    headerValue: "name",
                    nonBlankValueCount: 4,
                    blankValueCount: 0,
                    missingCellCount: 0,
                    sampleValues: [
                        "Alice",
                        "Bob",
                        "Carol"
                    ]
                },
                {
                    columnIndex: 1,
                    headerValue: "code",
                    nonBlankValueCount: 2,
                    blankValueCount: 1,
                    missingCellCount: 1,
                    sampleValues: [
                        "A001",
                        "D004"
                    ]
                }
            ]
        );
    }
);

test(
    "includes column observations when a header candidate is available",
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

            await fs.writeFile(
                filePath,
                "name,code\nAlice,A001\nBob,B002\n",
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.deepStrictEqual(
                result.columnObservations,
                [
                    {
                        columnIndex: 0,
                        headerValue: "name",
                        nonBlankValueCount: 2,
                        blankValueCount: 0,
                        missingCellCount: 0,
                        sampleValues: [
                            "Alice",
                            "Bob"
                        ]
                    },
                    {
                        columnIndex: 1,
                        headerValue: "code",
                        nonBlankValueCount: 2,
                        blankValueCount: 0,
                        missingCellCount: 0,
                        sampleValues: [
                            "A001",
                            "B002"
                        ]
                    }
                ]
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
    "does not infer column observations when delimiter is unresolved",
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

            await fs.writeFile(
                filePath,
                "alpha\nbeta\n",
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.strictEqual(
                result.columnObservations,
                null
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
    "returns the exact parsed rows used for physical CSV inspection",
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
                    "source.csv"
                );

            await fs.writeFile(
                filePath,
                [
                    "name\tcode",
                    "\" Alice \"\tA001",
                    "Bob\t\"B,002\"",
                    ""
                ].join("\n"),
                "utf8"
            );

            const result =
                await new CsvIntakeInspector()
                    .inspect(filePath);

            assert.strictEqual(
                result.delimiter,
                "\t"
            );

            assert.deepStrictEqual(
                result.rows,
                [
                    ["name", "code"],
                    [" Alice ", "A001"],
                    ["Bob", "B,002"]
                ]
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
