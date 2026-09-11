"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RegisteredFileSourceAdapter =
    require("./RegisteredFileSourceAdapter");

test("Word acquisition is isolated behind source adapter", async () => {
    const calls = [];

    const adapter =
        new RegisteredFileSourceAdapter({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "doc-key"
                    };
                },
                async normalizeRegisteredWord(
                    relativePath
                ) {
                    calls.push(relativePath);

                    return {
                        sourceType: "word",
                        documentType:
                            "support_record"
                    };
                }
            }
        });

    const result =
        await adapter.acquire(
            "nested/record.docx"
        );

    assert.deepStrictEqual(
        calls,
        ["nested/record.docx"]
    );

    assert.strictEqual(
        result.sourceType,
        "word"
    );

    assert.strictEqual(
        result.standardDocument
            .documentType,
        "support_record"
    );
});

test("Excel acquisition is isolated behind source adapter", async () => {
    const adapter =
        new RegisteredFileSourceAdapter({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "doc-key"
                    };
                },
                async normalizeRegisteredExcel() {
                    return {
                        sourceType: "excel",
                        documentType:
                            "support_record"
                    };
                }
            }
        });

    const result =
        await adapter.acquire(
            "record.xlsx"
        );

    assert.strictEqual(
        result.sourceType,
        "excel"
    );
});

test("legacy doc is not advertised as supported", async () => {
    const adapter =
        new RegisteredFileSourceAdapter({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "doc-key"
                    };
                }
            }
        });

    await assert.rejects(
        () =>
            adapter.acquire(
                "record.doc"
            ),
        /unsupported file type/
    );
});

test("observation remains a separate trusted source operation", async () => {
    const adapter =
        new RegisteredFileSourceAdapter({
            localConnectorService: {
                async observeRegisteredFile(
                    relativePath
                ) {
                    return {
                        relativePath,
                        sourceDocumentKey:
                            "trusted-key"
                    };
                }
            }
        });

    const observation =
        await adapter.observe(
            "nested/record.xlsx"
        );

    assert.strictEqual(
        observation.sourceDocumentKey,
        "trusted-key"
    );
});


test("raw Word acquisition returns source metadata and document", async () => {
    const document = {
        text: "Word原本"
    };

    const adapter =
        new RegisteredFileSourceAdapter({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "doc-key"
                    };
                },

                async getRegisteredFileMetadata() {
                    return {
                        fileName:
                            "record.docx",
                        extension:
                            ".docx",
                        size: 123,
                        updatedAt:
                            "2026-09-11T10:00:00Z"
                    };
                },

                async readRegisteredWord(
                    relativePath
                ) {
                    assert.strictEqual(
                        relativePath,
                        "nested/record.docx"
                    );

                    return document;
                }
            }
        });

    assert.deepStrictEqual(
        await adapter.acquireRaw(
            "nested/record.docx"
        ),
        {
            sourceType: "word",
            source: {
                fileName:
                    "record.docx",
                updatedAt:
                    "2026-09-11T10:00:00Z"
            },
            document
        }
    );
});

test("raw Excel acquisition returns source metadata and document", async () => {
    const document = {
        sheetNames: [
            "支援記録"
        ],
        sheets: []
    };

    const adapter =
        new RegisteredFileSourceAdapter({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "doc-key"
                    };
                },

                async getRegisteredFileMetadata() {
                    return {
                        fileName:
                            "record.xlsx",
                        extension:
                            ".xlsx",
                        size: 456,
                        updatedAt:
                            "2026-09-11T11:00:00Z"
                    };
                },

                async readRegisteredExcel(
                    relativePath
                ) {
                    assert.strictEqual(
                        relativePath,
                        "record.xlsx"
                    );

                    return document;
                }
            }
        });

    assert.deepStrictEqual(
        await adapter.acquireRaw(
            "record.xlsx"
        ),
        {
            sourceType: "excel",
            source: {
                fileName:
                    "record.xlsx",
                updatedAt:
                    "2026-09-11T11:00:00Z"
            },
            document
        }
    );
});

test("raw acquisition does not perform normalization or mapping", async () => {
    let normalized = false;

    const adapter =
        new RegisteredFileSourceAdapter({
            localConnectorService: {
                async observeRegisteredFile() {
                    return {
                        sourceDocumentKey:
                            "doc-key"
                    };
                },

                async getRegisteredFileMetadata() {
                    return {
                        fileName:
                            "record.xlsx",
                        extension:
                            ".xlsx",
                        size: 456,
                        updatedAt: null
                    };
                },

                async readRegisteredExcel() {
                    return {
                        sheets: []
                    };
                },

                async normalizeRegisteredExcel() {
                    normalized = true;
                    return {};
                }
            }
        });

    const result =
        await adapter.acquireRaw(
            "record.xlsx"
        );

    assert.strictEqual(
        normalized,
        false
    );

    assert.strictEqual(
        result.sourceType,
        "excel"
    );

    assert.deepStrictEqual(
        result.document,
        {
            sheets: []
        }
    );
});
