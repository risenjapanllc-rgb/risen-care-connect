"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const LocalSemanticRecordPreparationService =
    require("./LocalSemanticRecordPreparationService");

test("trusted sourceDocumentKey from registry is passed to semantic builder", async () => {
    const calls = [];

    const normalizedDocument = {
        documentType: "support_record",
        sourceType: "excel",
        source: {
            fileName: "support.xlsx",
            updatedAt: "2026-09-09T10:00:00Z"
        },
        extracted: {
            supportContent: {
                value: "支援内容"
            }
        }
    };

    const semanticRecords = [
        {
            provenance: {
                sourceDocumentKey:
                    "opaque-document-key-001"
            }
        }
    ];

    const service =
        new LocalSemanticRecordPreparationService({
            localConnectorService: {
                async observeRegisteredFile(fileName) {
                    calls.push([
                        "observe",
                        fileName
                    ]);

                    return {
                        sourceDocumentKey:
                            "opaque-document-key-001"
                    };
                },

                async normalizeRegisteredExcel(fileName) {
                    calls.push([
                        "normalizeExcel",
                        fileName
                    ]);

                    return normalizedDocument;
                }
            },

            semanticRecordBuilder: {
                build(document, trustedContext) {
                    calls.push([
                        "build",
                        document,
                        trustedContext
                    ]);

                    return semanticRecords;
                }
            }
        });

    const result =
        await service.prepareRegisteredFile(
            "support.xlsx"
        );

    assert.strictEqual(
        result,
        semanticRecords
    );

    assert.deepStrictEqual(
        calls,
        [
            [
                "observe",
                "support.xlsx"
            ],
            [
                "normalizeExcel",
                "support.xlsx"
            ],
            [
                "build",
                normalizedDocument,
                {
                    sourceDocumentKey:
                        "opaque-document-key-001"
                }
            ]
        ]
    );
});

test("Word document uses Word normalization", async () => {
    const calls = [];

    const service =
        new LocalSemanticRecordPreparationService({
            localConnectorService: {
                async observeRegisteredFile() {
                    calls.push("observe");

                    return {
                        sourceDocumentKey:
                            "doc-key-word"
                    };
                },

                async normalizeRegisteredWord(fileName) {
                    calls.push([
                        "normalizeWord",
                        fileName
                    ]);

                    return {
                        documentType:
                            "support_record"
                    };
                }
            },

            semanticRecordBuilder: {
                build(document, trustedContext) {
                    calls.push([
                        "build",
                        document,
                        trustedContext
                    ]);

                    return ["semantic-record"];
                }
            }
        });

    const result =
        await service.prepareRegisteredFile(
            "record.docx"
        );

    assert.deepStrictEqual(
        result,
        ["semantic-record"]
    );

    assert.deepStrictEqual(
        calls.map(
            value =>
                Array.isArray(value)
                    ? value[0]
                    : value
        ),
        [
            "observe",
            "normalizeWord",
            "build"
        ]
    );
});

test("unsupported extension fails before normalization", async () => {
    let normalized = false;

    const service =
        new LocalSemanticRecordPreparationService({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "doc-key"
                    };
                },

                async normalizeRegisteredExcel() {
                    normalized = true;
                }
            },

            semanticRecordBuilder: {
                build() {
                    throw new Error(
                        "builder must not run"
                    );
                }
            }
        });

    await assert.rejects(
        () =>
            service.prepareRegisteredFile(
                "record.pdf"
            ),
        /unsupported file type/
    );

    assert.strictEqual(
        normalized,
        false
    );
});

test("missing sourceDocumentKey fails before normalization", async () => {
    let normalized = false;

    const service =
        new LocalSemanticRecordPreparationService({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {};
                },

                async normalizeRegisteredExcel() {
                    normalized = true;
                }
            },

            semanticRecordBuilder: {
                build() {
                    throw new Error(
                        "builder must not run"
                    );
                }
            }
        });

    await assert.rejects(
        () =>
            service.prepareRegisteredFile(
                "record.xlsx"
            ),
        /sourceDocumentKey unavailable/
    );

    assert.strictEqual(
        normalized,
        false
    );
});

test("sourceDocumentKey is not taken from normalized document", async () => {
    let trustedContext;

    const service =
        new LocalSemanticRecordPreparationService({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "trusted-document-key"
                    };
                },

                async normalizeRegisteredExcel() {
                    return {
                        documentType:
                            "support_record",
                        sourceDocumentKey:
                            "client-controlled-key"
                    };
                }
            },

            semanticRecordBuilder: {
                build(document, context) {
                    trustedContext =
                        context;

                    assert.strictEqual(
                        document.sourceDocumentKey,
                        "client-controlled-key"
                    );

                    return [];
                }
            }
        });

    await service.prepareRegisteredFile(
        "record.xlsx"
    );

    assert.deepStrictEqual(
        trustedContext,
        {
            sourceDocumentKey:
                "trusted-document-key"
        }
    );
});
