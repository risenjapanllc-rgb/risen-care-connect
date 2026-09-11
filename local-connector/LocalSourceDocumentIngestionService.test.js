"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const LocalSourceDocumentIngestionService =
    require("./LocalSourceDocumentIngestionService");

test("builds source document from raw acquisition without semantic interpretation", async () => {
    const sent = [];

    const sourceAdapter = {
        async observe(relativePath) {
            assert.strictEqual(
                relativePath,
                "nested/source.csv"
            );

            return {
                sourceDocumentKey:
                    "source-document-key",
                size: 42
            };
        },

        async acquireRaw(relativePath) {
            assert.strictEqual(
                relativePath,
                "nested/source.csv"
            );

            return {
                sourceType: "csv",
                source: {
                    fileName:
                        "source.csv",
                    updatedAt:
                        "2026-09-11T10:00:00.000Z",
                    size:
                        42
                },
                document: {
                    sheetNames: ["csv"],
                    sheets: [
                        {
                            sheetName: "csv",
                            rows: [
                                ["A", "B"],
                                ["1", "2"]
                            ]
                        }
                    ]
                }
            };
        }
    };

    const httpClient = {
        async ingest(sourceDocument) {
            sent.push(sourceDocument);

            return {
                status: "created"
            };
        }
    };

    const service =
        new LocalSourceDocumentIngestionService({
            sourceAdapter,
            httpClient,
            clock:
                () =>
                    new Date(
                        "2026-09-11T10:05:00.000Z"
                    )
        });

    const result =
        await service.ingestRegisteredFile(
            "nested/source.csv"
        );

    assert.deepStrictEqual(
        result,
        {
            status: "created"
        }
    );

    assert.deepStrictEqual(
        sent,
        [
            {
                sourceDocumentKey:
                    "source-document-key",
                sourceType:
                    "csv",
                fileName:
                    "source.csv",
                sourceContent: {
                    sheetNames: ["csv"],
                    sheets: [
                        {
                            sheetName: "csv",
                            rows: [
                                ["A", "B"],
                                ["1", "2"]
                            ]
                        }
                    ]
                },
                sourceUpdatedAt:
                    "2026-09-11T10:00:00.000Z",
                sourceSize:
                    42,
                observedAt:
                    "2026-09-11T10:05:00.000Z"
            }
        ]
    );

    const persisted =
        sent[0];

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            persisted,
            "documentType"
        ),
        false
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            persisted,
            "residentId"
        ),
        false
    );

    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
            persisted,
            "semanticRecords"
        ),
        false
    );
});

test("normalizes raw Word content without requiring document type", async () => {
    let sent;

    const service =
        new LocalSourceDocumentIngestionService({
            sourceAdapter: {
                async observe() {
                    return {
                        sourceDocumentKey:
                            "word-source-key"
                    };
                },

                async acquireRaw() {
                    return {
                        sourceType: "word",
                        source: {
                            fileName:
                                "record.docx",
                            updatedAt:
                                null,
                            size:
                                null
                        },
                        document: {
                            text:
                                "原文テキスト"
                        }
                    };
                }
            },

            httpClient: {
                async ingest(value) {
                    sent = value;

                    return {
                        status: "unchanged"
                    };
                }
            },

            clock:
                () =>
                    new Date(
                        "2026-09-11T11:00:00.000Z"
                    )
        });

    await service.ingestRegisteredFile(
        "record.docx"
    );

    assert.deepStrictEqual(
        sent.sourceContent,
        {
            text:
                "原文テキスト"
        }
    );

    assert.strictEqual(
        sent.sourceSize,
        null
    );
});
