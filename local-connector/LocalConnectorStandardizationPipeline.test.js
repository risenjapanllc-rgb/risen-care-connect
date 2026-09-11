"use strict";

const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const LocalConnectorStandardizationPipeline =
    require(
        "./LocalConnectorStandardizationPipeline"
    );

function createSourceAdapter({
    sourceType = "excel",
    documentType = "support_record"
} = {}) {
    const calls = [];

    return {
        calls,

        async observe(relativePath) {
            calls.push("observe");

            return {
                sourceDocumentKey:
                    `source:${relativePath}`
            };
        },

        async acquireRaw(relativePath) {
            calls.push("acquireRaw");

            return {
                sourceType,
                source: {
                    fileName:
                        relativePath
                            .split("/")
                            .pop(),
                    updatedAt:
                        "2026-09-10T00:00:00.000Z"
                },
                document: {
                    raw: true,
                    documentType
                }
            };
        }
    };
}

function createPipeline({
    sourceType = "excel",
    documentType = "support_record"
} = {}) {
    const sourceAdapter =
        createSourceAdapter({
            sourceType,
            documentType
        });

    const calls =
        sourceAdapter.calls;

    const pipeline =
        new LocalConnectorStandardizationPipeline({
            sourceAdapter,

            documentTypeDetector: {
                detect(document) {
                    calls.push("detect");

                    return {
                        type:
                            document.documentType,
                        confidence:
                            document.documentType ===
                            "unknown"
                                ? "low"
                                : "high"
                    };
                }
            },

            documentNormalizer: {
                normalize({
                    sourceType:
                        normalizedSourceType,
                    fileName,
                    updatedAt,
                    document,
                    documentType:
                        detectedDocumentType
                }) {
                    calls.push("normalize");

                    assert.equal(
                        document.raw,
                        true
                    );

                    return {
                        sourceType:
                            normalizedSourceType,
                        documentType:
                            detectedDocumentType.type,
                        documentTypeConfidence:
                            detectedDocumentType.confidence,
                        source: {
                            fileName,
                            updatedAt
                        },
                        content: {
                            raw: true
                        },
                        extracted: {}
                    };
                }
            },

            mapper: {
                map(normalizedDocument) {
                    calls.push("map");

                    return {
                        ...normalizedDocument,
                        extracted: {
                            supportContent: {
                                value:
                                    "synthetic support"
                            }
                        }
                    };
                }
            },

            validator: {
                validate(standardDocument) {
                    calls.push("validate");

                    const valid =
                        standardDocument
                            .documentType !==
                        "unknown";

                    return {
                        valid,
                        issues:
                            valid
                                ? []
                                : [
                                    "document_type_unresolved"
                                ]
                    };
                }
            },

            qualityEvaluator: {
                evaluate({
                    validation
                }) {
                    calls.push("quality");

                    return {
                        acceptable:
                            validation.valid,
                        signals: []
                    };
                }
            }
        });

    return {
        pipeline,
        calls
    };
}

test(
    "pipeline executes the common raw standardization stages in order",
    async () => {
        const {
            pipeline,
            calls
        } = createPipeline();

        const result =
            await pipeline
                .processRegisteredFile(
                    "records/a.xlsx"
                );

        assert.deepEqual(
            calls,
            [
                "observe",
                "acquireRaw",
                "detect",
                "normalize",
                "map",
                "validate",
                "quality"
            ]
        );

        assert.equal(
            result.source.relativePath,
            "records/a.xlsx"
        );
        assert.equal(
            result.source.sourceDocumentKey,
            "source:records/a.xlsx"
        );
        assert.equal(
            result.acquisition.sourceType,
            "excel"
        );
        assert.equal(
            result.mapping.documentType,
            "support_record"
        );
        assert.equal(
            result.validation.valid,
            true
        );
        assert.equal(
            result.quality.acceptable,
            true
        );
    }
);

test(
    "Word uses the same raw standardization pipeline",
    async () => {
        const {
            pipeline,
            calls
        } = createPipeline({
            sourceType: "word"
        });

        const result =
            await pipeline
                .processRegisteredFile(
                    "records/a.docx"
                );

        assert.equal(
            result.acquisition.sourceType,
            "word"
        );

        assert.deepEqual(
            calls,
            [
                "observe",
                "acquireRaw",
                "detect",
                "normalize",
                "map",
                "validate",
                "quality"
            ]
        );
    }
);

test(
    "unresolved document type remains visible to validation and quality",
    async () => {
        const {
            pipeline
        } = createPipeline({
            documentType: "unknown"
        });

        const result =
            await pipeline
                .processRegisteredFile(
                    "records/a.xlsx"
                );

        assert.equal(
            result.validation.valid,
            false
        );
        assert.deepEqual(
            result.validation.issues,
            [
                "document_type_unresolved"
            ]
        );
        assert.equal(
            result.quality.acceptable,
            false
        );
    }
);

test(
    "pipeline never calls legacy completed-document acquisition",
    async () => {
        let legacyCalled = false;

        const sourceAdapter = {
            async observe() {
                return {
                    sourceDocumentKey:
                        "source-key"
                };
            },

            async acquireRaw() {
                return {
                    sourceType: "word",
                    source: {
                        fileName:
                            "record.docx",
                        updatedAt: null
                    },
                    document: {
                        text:
                            "支援記録 支援内容"
                    }
                };
            },

            async acquire() {
                legacyCalled = true;

                throw new Error(
                    "legacy acquisition must not run"
                );
            }
        };

        const pipeline =
            new LocalConnectorStandardizationPipeline({
                sourceAdapter
            });

        await pipeline
            .processRegisteredFile(
                "record.docx"
            );

        assert.equal(
            legacyCalled,
            false
        );
    }
);

test(
    "generic source entry processes an injected MySQL source adapter",
    async () => {
        const pipeline =
            new LocalConnectorStandardizationPipeline({
                sourceAdapter: {
                    async observe(sourceReference) {
                        assert.strictEqual(
                            sourceReference,
                            "resident-support"
                        );

                        return {
                            sourceDocumentKey:
                                "opaque-mysql-key"
                        };
                    },
                    async acquireRaw(sourceReference) {
                        assert.strictEqual(
                            sourceReference,
                            "resident-support"
                        );

                        return {
                            sourceType: "mysql",
                            source: {
                                fileName:
                                    "resident-support.mysql",
                                updatedAt:
                                    "2026-09-11T00:00:00.000Z"
                            },
                            document: {
                                sheetNames: [
                                    "resident-support"
                                ],
                                sheets: [
                                    {
                                        sheetName:
                                            "resident-support",
                                        rows: [
                                            [
                                                "利用者名",
                                                "居室番号",
                                                "本人の意向"
                                            ],
                                            [
                                                "山田太郎",
                                                "101",
                                                "自宅生活を続けたい"
                                            ]
                                        ]
                                    }
                                ]
                            }
                        };
                    }
                }
            });

        const result =
            await pipeline.processSource(
                "resident-support"
            );

        assert.strictEqual(
            result.source.sourceDocumentKey,
            "opaque-mysql-key"
        );

        assert.strictEqual(
            result.standardDocument.sourceType,
            "mysql"
        );
    }
);
