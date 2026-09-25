"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const CsvIntakeAnalysisReportBuilder =
    require("./CsvIntakeAnalysisReportBuilder");

test(
    "builds a versioned report from physical CSV observations",
    () => {
        const builder =
            new CsvIntakeAnalysisReportBuilder();

        const result =
            builder.build({
                encoding: "utf-8",
                encodingConfidence: "ambiguous",
                compatibleEncodings: [
                    "utf-8",
                    "shift_jis",
                    "euc-jp"
                ],
                bom: null,
                byteSize: 42,
                text:
                    "name,code\nAlice,A001\n",
                delimiter: ",",
                delimiterConfidence: "structural",
                delimiterCandidates: [
                    {
                        delimiter: ",",
                        rowCount: 2,
                        columnCounts: [2, 2],
                        modeColumnCount: 2,
                        consistentRowCount: 2,
                        consistencyRatio: 1
                    }
                ],
                rowShape: {
                    rowCount: 2,
                    nonBlankRowCount: 2,
                    blankRowCount: 0,
                    columnCountFrequencies: [
                        {
                            columnCount: 2,
                            rowCount: 2
                        }
                    ],
                    modeColumnCount: 2,
                    consistentRowCount: 2,
                    consistencyRatio: 1,
                    shapeConfidence: "structural",
                    irregularRows: []
                },
                headerCandidate: {
                    rowIndex: 0,
                    columnCount: 2,
                    confidence: "candidate"
                },
                columnObservations: [
                    {
                        columnIndex: 0,
                        headerValue: "name",
                        nonBlankValueCount: 1,
                        blankValueCount: 0,
                        missingCellCount: 0,
                        sampleValues: ["Alice"]
                    },
                    {
                        columnIndex: 1,
                        headerValue: "code",
                        nonBlankValueCount: 1,
                        blankValueCount: 0,
                        missingCellCount: 0,
                        sampleValues: ["A001"]
                    }
                ]
            });

        assert.deepStrictEqual(
            result,
            {
                reportVersion:
                    "csv-intake-v1",
                source: {
                    byteSize: 42
                },
                encoding: {
                    selected: "utf-8",
                    confidence: "ambiguous",
                    compatible: [
                        "utf-8",
                        "shift_jis",
                        "euc-jp"
                    ],
                    bom: null
                },
                delimiter: {
                    selected: ",",
                    confidence: "structural",
                    candidates: [
                        {
                            delimiter: ",",
                            rowCount: 2,
                            columnCounts: [2, 2],
                            modeColumnCount: 2,
                            consistentRowCount: 2,
                            consistencyRatio: 1
                        }
                    ]
                },
                structure: {
                    rowShape: {
                        rowCount: 2,
                        nonBlankRowCount: 2,
                        blankRowCount: 0,
                        columnCountFrequencies: [
                            {
                                columnCount: 2,
                                rowCount: 2
                            }
                        ],
                        modeColumnCount: 2,
                        consistentRowCount: 2,
                        consistencyRatio: 1,
                        shapeConfidence:
                            "structural",
                        irregularRows: []
                    },
                    headerCandidate: {
                        rowIndex: 0,
                        columnCount: 2,
                        confidence: "candidate"
                    },
                    columnObservations: [
                        {
                            columnIndex: 0,
                            headerValue: "name",
                            nonBlankValueCount: 1,
                            blankValueCount: 0,
                            missingCellCount: 0,
                            sampleValues: [
                                "Alice"
                            ]
                        },
                        {
                            columnIndex: 1,
                            headerValue: "code",
                            nonBlankValueCount: 1,
                            blankValueCount: 0,
                            missingCellCount: 0,
                            sampleValues: [
                                "A001"
                            ]
                        }
                    ]
                }
            }
        );
    }
);

test(
    "does not include raw CSV text or unknown fields",
    () => {
        const builder =
            new CsvIntakeAnalysisReportBuilder();

        const result =
            builder.build({
                encoding: "utf-8",
                encodingConfidence: "structural",
                compatibleEncodings: ["utf-8"],
                bom: null,
                byteSize: 100,
                text:
                    "sensitive raw CSV content",
                delimiter: null,
                delimiterConfidence: "undetermined",
                delimiterCandidates: [],
                rowShape: null,
                headerCandidate: null,
                columnObservations: null,
                facilityId:
                    "client-facility",
                semanticType:
                    "should-not-propagate",
                unknown:
                    "unknown-value"
            });

        const serialized =
            JSON.stringify(result);

        assert.strictEqual(
            serialized.includes(
                "sensitive raw CSV content"
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "client-facility"
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "should-not-propagate"
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "unknown-value"
            ),
            false
        );
    }
);

test(
    "preserves unresolved structural observations as null",
    () => {
        const builder =
            new CsvIntakeAnalysisReportBuilder();

        const result =
            builder.build({
                encoding: "utf-8",
                encodingConfidence: "ambiguous",
                compatibleEncodings: [
                    "utf-8",
                    "shift_jis"
                ],
                bom: null,
                byteSize: 10,
                delimiter: null,
                delimiterConfidence: "ambiguous",
                delimiterCandidates: [],
                rowShape: null,
                headerCandidate: null,
                columnObservations: null
            });

        assert.deepStrictEqual(
            result.structure,
            {
                rowShape: null,
                headerCandidate: null,
                columnObservations: null
            }
        );

        assert.strictEqual(
            result.delimiter.selected,
            null
        );
    }
);

test(
    "returns null for invalid inspection input",
    () => {
        const builder =
            new CsvIntakeAnalysisReportBuilder();

        assert.strictEqual(
            builder.build(null),
            null
        );

        assert.strictEqual(
            builder.build([]),
            null
        );

        assert.strictEqual(
            builder.build("csv"),
            null
        );
    }
);

test(
    "builds a snapshot independent from later inspection mutation",
    () => {
        const builder =
            new CsvIntakeAnalysisReportBuilder();

        const inspection = {
            encoding: "utf-8",
            encodingConfidence: "structural",
            compatibleEncodings: ["utf-8"],
            bom: null,
            byteSize: 20,
            delimiter: ",",
            delimiterConfidence: "structural",
            delimiterCandidates: [
                {
                    delimiter: ",",
                    rowCount: 2
                }
            ],
            rowShape: {
                rowCount: 2,
                nonBlankRowCount: 2
            },
            headerCandidate: {
                rowIndex: 0,
                columnCount: 1,
                confidence: "candidate"
            },
            columnObservations: [
                {
                    columnIndex: 0,
                    headerValue: "name",
                    nonBlankValueCount: 1,
                    blankValueCount: 0,
                    missingCellCount: 0,
                    sampleValues: ["Alice"]
                }
            ]
        };

        const result =
            builder.build(inspection);

        inspection.compatibleEncodings.push(
            "shift_jis"
        );
        inspection.delimiterCandidates[0]
            .rowCount = 99;
        inspection.rowShape.rowCount = 99;
        inspection.headerCandidate.rowIndex = 9;
        inspection.columnObservations[0]
            .headerValue = "changed";
        inspection.columnObservations[0]
            .sampleValues[0] = "Bob";

        assert.deepStrictEqual(
            result.encoding.compatible,
            ["utf-8"]
        );

        assert.strictEqual(
            result.delimiter.candidates[0]
                .rowCount,
            2
        );

        assert.strictEqual(
            result.structure.rowShape.rowCount,
            2
        );

        assert.strictEqual(
            result.structure.headerCandidate
                .rowIndex,
            0
        );

        assert.strictEqual(
            result.structure
                .columnObservations[0]
                .headerValue,
            "name"
        );

        assert.deepStrictEqual(
            result.structure
                .columnObservations[0]
                .sampleValues,
            ["Alice"]
        );
    }
);

test(
    "does not propagate unknown nested observation fields",
    () => {
        const builder =
            new CsvIntakeAnalysisReportBuilder();

        const result =
            builder.build({
                encoding: "utf-8",
                encodingConfidence: "structural",
                compatibleEncodings: [
                    "utf-8"
                ],
                bom: null,
                byteSize: 20,
                delimiter: ",",
                delimiterConfidence: "structural",
                delimiterCandidates: [
                    {
                        delimiter: ",",
                        rowCount: 2,
                        columnCounts: [2, 2],
                        modeColumnCount: 2,
                        consistentRowCount: 2,
                        consistencyRatio: 1,
                        internalScore:
                            "delimiter-secret"
                    }
                ],
                rowShape: {
                    rowCount: 2,
                    nonBlankRowCount: 2,
                    blankRowCount: 0,
                    columnCountFrequencies: [
                        {
                            columnCount: 2,
                            rowCount: 2,
                            internalScore:
                                "frequency-secret"
                        }
                    ],
                    modeColumnCount: 2,
                    consistentRowCount: 2,
                    consistencyRatio: 1,
                    shapeConfidence:
                        "structural",
                    irregularRows: [],
                    internalScore:
                        "shape-secret"
                },
                headerCandidate: {
                    rowIndex: 0,
                    columnCount: 2,
                    confidence: "candidate",
                    inferredMeaning:
                        "header-secret"
                },
                columnObservations: [
                    {
                        columnIndex: 0,
                        headerValue: "name",
                        nonBlankValueCount: 1,
                        blankValueCount: 0,
                        missingCellCount: 0,
                        sampleValues: [
                            "Alice"
                        ],
                        semanticType:
                            "nested-secret"
                    }
                ]
            });

        const serialized =
            JSON.stringify(result);

        for (
            const forbidden of [
                "delimiter-secret",
                "frequency-secret",
                "shape-secret",
                "header-secret",
                "nested-secret"
            ]
        ) {
            assert.strictEqual(
                serialized.includes(forbidden),
                false
            );
        }
    }
);

test(
    "builds a report from actual CsvIntakeInspector output",
    async () => {
        const fs =
            require("node:fs/promises");
        const os =
            require("node:os");
        const path =
            require("node:path");
        const CsvIntakeInspector =
            require("./CsvIntakeInspector");

        const tempDir =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "csv-intake-report-"
                )
            );

        const filePath =
            path.join(
                tempDir,
                "sample.csv"
            );

        try {
            await fs.writeFile(
                filePath,
                "name,code\nAlice,A001\nBob,B002\n",
                "utf8"
            );

            const inspector =
                new CsvIntakeInspector();

            const inspection =
                await inspector.inspect(
                    filePath
                );

            const builder =
                new CsvIntakeAnalysisReportBuilder();

            const report =
                builder.build(inspection);

            assert.strictEqual(
                report.reportVersion,
                "csv-intake-v1"
            );

            assert.strictEqual(
                report.delimiter.selected,
                ","
            );

            assert.deepStrictEqual(
                report.structure.headerCandidate,
                {
                    rowIndex: 0,
                    columnCount: 2,
                    confidence: "candidate"
                }
            );

            assert.deepStrictEqual(
                report.structure
                    .columnObservations,
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

            assert.strictEqual(
                Object.hasOwn(
                    report,
                    "text"
                ),
                false
            );
        } finally {
            await fs.rm(
                tempDir,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);
