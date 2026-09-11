"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const StandardDocumentMapper =
    require("./StandardDocumentMapper");

test("Word mapping adds semantic extraction without source field rows", () => {
    const mapper =
        new StandardDocumentMapper({
            documentSemanticExtractor: {
                extract() {
                    return {
                        supportContent: {
                            value: "支援内容"
                        }
                    };
                }
            },
            sourceFieldExtractor: {
                extractExcelRows() {
                    throw new Error(
                        "Excel extraction must not run"
                    );
                }
            },
            sourceMeaningInterpreter: {
                interpret() {
                    throw new Error(
                        "meaning interpretation must not run"
                    );
                }
            }
        });

    const result =
        mapper.map({
            sourceType: "word",
            documentType:
                "support_record",
            content: {
                text: "支援内容"
            }
        });

    assert.deepStrictEqual(
        result.extracted,
        {
            supportContent: {
                value: "支援内容"
            }
        }
    );
});

test("Excel mapping preserves source fields and attaches meanings", () => {
    const mapper =
        new StandardDocumentMapper({
            documentSemanticExtractor: {
                extract() {
                    return {
                        sourceResidentName: {
                            value: "利用者A"
                        }
                    };
                }
            },
            sourceFieldExtractor: {
                extractExcelRows() {
                    return [
                        {
                            sheetName:
                                "利用者一覧",
                            rowIndex: 2,
                            fields: {
                                利用者名:
                                    "利用者A",
                                性格:
                                    "穏やか"
                            }
                        }
                    ];
                }
            },
            sourceMeaningInterpreter: {
                interpret(fields) {
                    assert.strictEqual(
                        fields.性格,
                        "穏やか"
                    );

                    return {
                        meanings: {
                            personality:
                                "性格"
                        }
                    };
                }
            }
        });

    const result =
        mapper.map({
            sourceType: "excel",
            documentType:
                "support_record",
            content: {
                sheets: []
            }
        });

    assert.deepStrictEqual(
        result.extracted,
        {
            sourceResidentName: {
                value: "利用者A"
            },
            sourceFields: [
                {
                    sheetName:
                        "利用者一覧",
                    rowIndex: 2,
                    fields: {
                        利用者名:
                            "利用者A",
                        性格:
                            "穏やか"
                    },
                    meanings: {
                        personality:
                            "性格"
                    }
                }
            ]
        }
    );
});

test("mapping does not mutate the standard document", () => {
    const mapper =
        new StandardDocumentMapper({
            documentSemanticExtractor: {
                extract() {
                    return {};
                }
            },
            sourceFieldExtractor: {
                extractExcelRows() {
                    return [];
                }
            },
            sourceMeaningInterpreter: {
                interpret() {
                    return {
                        meanings: {}
                    };
                }
            }
        });

    const input = {
        sourceType: "word",
        documentType:
            "support_record",
        content: {
            text: "original"
        },
        extracted: {}
    };

    const before =
        JSON.stringify(input);

    mapper.map(input);

    assert.strictEqual(
        JSON.stringify(input),
        before
    );
});

test(
    "CSV uses the common tabular mapping path",
    () => {
        const sourceFields = [
            {
                sheetName: "csv",
                rowIndex: 2,
                fields: {
                    利用者名: "山田太郎",
                    支援内容: "支援内容"
                }
            }
        ];

        const mapper =
            new StandardDocumentMapper({
                documentSemanticExtractor: {
                    extract() {
                        return {
                            supportContent: {
                                value: "支援内容"
                            }
                        };
                    }
                },
                sourceFieldExtractor: {
                    extractExcelRows(document) {
                        assert.deepStrictEqual(
                            document,
                            {
                                sheetNames: ["csv"],
                                sheets: []
                            }
                        );

                        return sourceFields;
                    }
                },
                sourceMeaningInterpreter: {
                    interpret(fields) {
                        return {
                            meanings: {
                                sourceResidentName:
                                    fields.利用者名
                            }
                        };
                    }
                }
            });

        const result =
            mapper.map({
                sourceType: "csv",
                documentType: "support_record",
                content: {
                    sheetNames: ["csv"],
                    sheets: []
                },
                extracted: {}
            });

        assert.deepStrictEqual(
            result.extracted.sourceFields,
            [
                {
                    ...sourceFields[0],
                    meanings: {
                        sourceResidentName:
                            "山田太郎"
                    }
                }
            ]
        );
    }
);

test(
    "MySQL uses the common tabular mapping path",
    () => {
        let extractedRows = 0;

        const mapper =
            new StandardDocumentMapper({
                documentSemanticExtractor: {
                    extract() {
                        return {};
                    }
                },
                sourceFieldExtractor: {
                    extractExcelRows() {
                        extractedRows += 1;

                        return [];
                    }
                },
                sourceMeaningInterpreter: {
                    interpret() {
                        return {
                            meanings: {}
                        };
                    }
                }
            });

        mapper.map({
            sourceType: "mysql",
            documentType: "support_record",
            content: {
                sheetNames: ["query"],
                sheets: []
            },
            extracted: {}
        });

        assert.strictEqual(
            extractedRows,
            1
        );
    }
);
