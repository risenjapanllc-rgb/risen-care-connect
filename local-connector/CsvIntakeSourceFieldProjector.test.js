"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const CsvIntakeSourceFieldProjector =
    require("./CsvIntakeSourceFieldProjector");

test(
    "projects CSV intake columns into existing source field identities",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        const report = {
            reportVersion: "csv-intake-v1",
            structure: {
                headerCandidate: {
                    rowIndex: 0,
                    columnCount: 2,
                    confidence: "candidate"
                },
                columnObservations: [
                    {
                        columnIndex: 0,
                        headerValue: "利用者氏名",
                        nonBlankValueCount: 2,
                        blankValueCount: 0,
                        missingCellCount: 0,
                        sampleValues: [
                            "山田 太郎",
                            "佐藤 花子"
                        ]
                    },
                    {
                        columnIndex: 1,
                        headerValue: "利用者コード",
                        nonBlankValueCount: 2,
                        blankValueCount: 0,
                        missingCellCount: 0,
                        sampleValues: [
                            "A001",
                            "A002"
                        ]
                    }
                ]
            }
        };

        assert.deepEqual(
            projector.project(report),
            [
                {
                    sourceFieldKey:
                        "sheet:0:column:0",
                    sheetIndex: 0,
                    sheetName: "",
                    columnIndex: 0,
                    headerLabel:
                        "利用者氏名"
                },
                {
                    sourceFieldKey:
                        "sheet:0:column:1",
                    sheetIndex: 0,
                    sheetName: "",
                    columnIndex: 1,
                    headerLabel:
                        "利用者コード"
                }
            ]
        );
    }
);

test(
    "does not project source fields when the header candidate is unresolved",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        assert.deepEqual(
            projector.project({
                reportVersion:
                    "csv-intake-v1",
                structure: {
                    headerCandidate: null,
                    columnObservations: null
                }
            }),
            []
        );
    }
);

test(
    "rejects a report from an unsupported contract version",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        assert.throws(
            () =>
                projector.project({
                    reportVersion:
                        "csv-intake-v2",
                    structure: {
                        headerCandidate: null,
                        columnObservations: null
                    }
                }),
            /unsupported CSV intake report version/
        );
    }
);

test(
    "rejects an invalid physical column index",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        assert.throws(
            () =>
                projector.project({
                    reportVersion: "csv-intake-v1",
                    structure: {
                        headerCandidate: {
                            rowIndex: 0,
                            columnCount: 1,
                            confidence: "candidate"
                        },
                        columnObservations: [
                            {
                                columnIndex: -1,
                                headerValue: "利用者氏名"
                            }
                        ]
                    }
                }),
            /invalid CSV intake column observation/
        );
    }
);

test(
    "rejects column observations inconsistent with the header candidate",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        assert.throws(
            () =>
                projector.project({
                    reportVersion: "csv-intake-v1",
                    structure: {
                        headerCandidate: {
                            rowIndex: 0,
                            columnCount: 2,
                            confidence: "candidate"
                        },
                        columnObservations: [
                            {
                                columnIndex: 0,
                                headerValue: "利用者氏名"
                            }
                        ]
                    }
                }),
            /inconsistent CSV intake structure/
        );
    }
);

test(
    "projects only source-field identity properties",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        const result =
            projector.project({
                reportVersion: "csv-intake-v1",
                structure: {
                    headerCandidate: {
                        rowIndex: 0,
                        columnCount: 1,
                        confidence: "candidate"
                    },
                    columnObservations: [
                        {
                            columnIndex: 0,
                            headerValue: "利用者氏名",
                            semanticType: "user.name",
                            confirmedMeaning: "user.name",
                            sampleValues: ["山田 太郎"]
                        }
                    ]
                }
            });

        assert.deepEqual(result, [
            {
                sourceFieldKey:
                    "sheet:0:column:0",
                sheetIndex: 0,
                sheetName: "",
                columnIndex: 0,
                headerLabel: "利用者氏名"
            }
        ]);

        assert.equal(
            Object.hasOwn(
                result[0],
                "semanticType"
            ),
            false
        );

        assert.equal(
            Object.hasOwn(
                result[0],
                "confirmedMeaning"
            ),
            false
        );
    }
);

test(
    "rejects duplicate physical column indexes",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        assert.throws(
            () =>
                projector.project({
                    reportVersion: "csv-intake-v1",
                    structure: {
                        headerCandidate: {
                            rowIndex: 0,
                            columnCount: 2,
                            confidence: "candidate"
                        },
                        columnObservations: [
                            {
                                columnIndex: 0,
                                headerValue: "列A"
                            },
                            {
                                columnIndex: 0,
                                headerValue: "列B"
                            }
                        ]
                    }
                }),
            /inconsistent CSV intake column identity/
        );
    }
);

test(
    "rejects a physical column index outside the header column range",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        assert.throws(
            () =>
                projector.project({
                    reportVersion: "csv-intake-v1",
                    structure: {
                        headerCandidate: {
                            rowIndex: 0,
                            columnCount: 2,
                            confidence: "candidate"
                        },
                        columnObservations: [
                            {
                                columnIndex: 0,
                                headerValue: "列A"
                            },
                            {
                                columnIndex: 2,
                                headerValue: "列B"
                            }
                        ]
                    }
                }),
            /inconsistent CSV intake column identity/
        );
    }
);

test(
    "preserves physical header values without normalization or field removal",
    () => {
        const projector =
            new CsvIntakeSourceFieldProjector();

        assert.deepEqual(
            projector.project({
                reportVersion: "csv-intake-v1",
                structure: {
                    headerCandidate: {
                        rowIndex: 0,
                        columnCount: 3,
                        confidence: "candidate"
                    },
                    columnObservations: [
                        {
                            columnIndex: 0,
                            headerValue: " 利用者氏名 "
                        },
                        {
                            columnIndex: 1,
                            headerValue: ""
                        },
                        {
                            columnIndex: 2,
                            headerValue: "利用者コード"
                        }
                    ]
                }
            }),
            [
                {
                    sourceFieldKey:
                        "sheet:0:column:0",
                    sheetIndex: 0,
                    sheetName: "",
                    columnIndex: 0,
                    headerLabel:
                        " 利用者氏名 "
                },
                {
                    sourceFieldKey:
                        "sheet:0:column:1",
                    sheetIndex: 0,
                    sheetName: "",
                    columnIndex: 1,
                    headerLabel: ""
                },
                {
                    sourceFieldKey:
                        "sheet:0:column:2",
                    sheetIndex: 0,
                    sheetName: "",
                    columnIndex: 2,
                    headerLabel:
                        "利用者コード"
                }
            ]
        );
    }
);

test(
    "projects source field identities from an actual CSV intake report",
    async () => {
        const fs =
            require("node:fs/promises");
        const os =
            require("node:os");
        const path =
            require("node:path");

        const CsvIntakeInspector =
            require("./CsvIntakeInspector");
        const CsvIntakeAnalysisReportBuilder =
            require("./CsvIntakeAnalysisReportBuilder");

        const tempDir =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "csv-source-field-projector-"
                )
            );

        try {
            const filePath =
                path.join(
                    tempDir,
                    "source.csv"
                );

            await fs.writeFile(
                filePath,
                [
                    "利用者氏名,利用者コード,利用日",
                    "山田 太郎,A001,2026-09-01",
                    "佐藤 花子,A002,2026-09-02"
                ].join("\n"),
                "utf8"
            );

            const inspector =
                new CsvIntakeInspector();
            const reportBuilder =
                new CsvIntakeAnalysisReportBuilder();
            const projector =
                new CsvIntakeSourceFieldProjector();

            const inspection =
                await inspector.inspect(
                    filePath
                );

            const report =
                reportBuilder.build(
                    inspection
                );

            assert.deepEqual(
                projector.project(report),
                [
                    {
                        sourceFieldKey:
                            "sheet:0:column:0",
                        sheetIndex: 0,
                        sheetName: "",
                        columnIndex: 0,
                        headerLabel:
                            "利用者氏名"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:1",
                        sheetIndex: 0,
                        sheetName: "",
                        columnIndex: 1,
                        headerLabel:
                            "利用者コード"
                    },
                    {
                        sourceFieldKey:
                            "sheet:0:column:2",
                        sheetIndex: 0,
                        sheetName: "",
                        columnIndex: 2,
                        headerLabel:
                            "利用日"
                    }
                ]
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
