"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const SourceTemplateStructureFingerprint =
    require(
        "./SourceTemplateStructureFingerprint"
    );

function csvFields() {
    return [
        {
            sourceFieldKey:
                "sheet:0:column:0",
            sheetIndex: 0,
            sheetName: "csv",
            columnIndex: 0,
            headerLabel:
                "利用者番号"
        },
        {
            sourceFieldKey:
                "sheet:0:column:1",
            sheetIndex: 0,
            sheetName: "csv",
            columnIndex: 1,
            headerLabel:
                "氏名"
        },
        {
            sourceFieldKey:
                "sheet:0:column:3",
            sheetIndex: 0,
            sheetName: "csv",
            columnIndex: 3,
            headerLabel:
                "生年月日"
        }
    ];
}

test(
    "generates stable CSV fingerprint from structural fields",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        const first =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions:
                    csvFields()
            });

        const second =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions:
                    [...csvFields()].reverse()
            });

        assert.equal(
            first.status,
            "generated"
        );

        assert.equal(
            second.status,
            "generated"
        );

        assert.equal(
            first.fingerprint,
            second.fingerprint
        );

        assert.equal(
            first.canonicalizationVersion,
            "risen-source-template-canonicalization-1"
        );

        assert.match(
            first.fingerprint,
            /^[0-9a-f]{64}$/
        );
    }
);

test(
    "normalizes NFKC and whitespace before fingerprinting",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        const first =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions: [
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 0,
                        headerLabel:
                            "Ｅ-mail"
                    },
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 1,
                        headerLabel:
                            "受給者証　番号"
                    }
                ]
            });

        const second =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions: [
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 0,
                        headerLabel:
                            " E-mail "
                    },
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 1,
                        headerLabel:
                            "受給者証 番号"
                    }
                ]
            });

        assert.equal(
            first.fingerprint,
            second.fingerprint
        );
    }
);

test(
    "CSV column position remains structurally significant",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        const first =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions:
                    csvFields()
            });

        const changed =
            csvFields();

        changed[1] = {
            ...changed[1],
            columnIndex: 2,
            sourceFieldKey:
                "sheet:0:column:2"
        };

        const second =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions:
                    changed
            });

        assert.notEqual(
            first.fingerprint,
            second.fingerprint
        );
    }
);

test(
    "duplicate header labels remain distinct through column position",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        const result =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions: [
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 0,
                        headerLabel: "氏名"
                    },
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 2,
                        headerLabel: "氏名"
                    }
                ]
            });

        assert.equal(
            result.status,
            "generated"
        );

        assert.deepStrictEqual(
            result.canonicalStructure.fields,
            [
                {
                    columnIndex: 0,
                    headerLabel: "氏名"
                },
                {
                    columnIndex: 2,
                    headerLabel: "氏名"
                }
            ]
        );
    }
);

test(
    "Excel sheet identity participates in fingerprint",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        const baseFields = [
            {
                sheetIndex: 0,
                sheetName:
                    "利用者一覧",
                columnIndex: 0,
                headerLabel:
                    "利用者番号"
            },
            {
                sheetIndex: 0,
                sheetName:
                    "利用者一覧",
                columnIndex: 1,
                headerLabel:
                    "氏名"
            }
        ];

        const first =
            generator.generate({
                sourceType: "excel",
                fieldDefinitions:
                    baseFields
            });

        const second =
            generator.generate({
                sourceType: "excel",
                fieldDefinitions:
                    baseFields.map(
                        field => ({
                            ...field,
                            sheetName:
                                "利用者台帳"
                        })
                    )
            });

        assert.equal(
            first.status,
            "generated"
        );

        assert.equal(
            second.status,
            "generated"
        );

        assert.notEqual(
            first.fingerprint,
            second.fingerprint
        );
    }
);

test(
    "rejects conflicting sheet names for the same Excel sheet index",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        const result =
            generator.generate({
                sourceType: "excel",
                fieldDefinitions: [
                    {
                        sheetIndex: 0,
                        sheetName:
                            "利用者一覧",
                        columnIndex: 0,
                        headerLabel:
                            "利用者番号"
                    },
                    {
                        sheetIndex: 0,
                        sheetName:
                            "利用者台帳",
                        columnIndex: 1,
                        headerLabel:
                            "氏名"
                    }
                ]
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "invalid_structure"
            }
        );
    }
);

test(
    "Word remains unsupported in fingerprint v1",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        assert.deepStrictEqual(
            generator.generate({
                sourceType: "word",
                fieldDefinitions: []
            }),
            {
                status:
                    "unsupported_source_type"
            }
        );
    }
);

test(
    "rejects ambiguous duplicate structural positions",
    () => {
        const generator =
            new SourceTemplateStructureFingerprint();

        const result =
            generator.generate({
                sourceType: "csv",
                fieldDefinitions: [
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 0,
                        headerLabel:
                            "利用者番号"
                    },
                    {
                        sheetIndex: 0,
                        sheetName: "csv",
                        columnIndex: 0,
                        headerLabel:
                            "氏名"
                    }
                ]
            });

        assert.equal(
            result.status,
            "invalid_structure"
        );
    }
);
