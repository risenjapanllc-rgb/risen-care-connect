"use strict";

const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const LocalSemanticRecordPreparationService =
    require(
        "./LocalSemanticRecordPreparationService"
    );

function createPipelineResult({
    sourceDocumentKey =
        "opaque-document-key-001",
    standardDocument = {
        documentType:
            "support_record",
        sourceType:
            "excel",
        source: {
            fileName:
                "support.xlsx",
            updatedAt:
                "2026-09-09T10:00:00Z"
        },
        extracted: {
            supportContent: {
                value:
                    "支援内容"
            }
        }
    }
} = {}) {
    return {
        source: {
            sourceDocumentKey
        },
        validation: {
            valid: true,
            issues: []
        },
        quality: {
            acceptable: true,
            signals: []
        },
        standardDocument
    };
}

test(
    "trusted sourceDocumentKey from pipeline is passed to semantic builder",
    async () => {
        const calls = [];

        const standardDocument = {
            documentType:
                "support_record",
            sourceType:
                "excel",
            source: {
                fileName:
                    "support.xlsx",
                updatedAt:
                    "2026-09-09T10:00:00Z"
            },
            extracted: {
                supportContent: {
                    value:
                        "支援内容"
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
                standardizationPipeline: {
                    async processRegisteredFile(
                        fileName
                    ) {
                        calls.push([
                            "pipeline",
                            fileName
                        ]);

                        return createPipelineResult({
                            standardDocument
                        });
                    }
                },

                semanticRecordBuilder: {
                    build(
                        document,
                        trustedContext
                    ) {
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
                    "pipeline",
                    "support.xlsx"
                ],
                [
                    "build",
                    standardDocument,
                    {
                        sourceDocumentKey:
                            "opaque-document-key-001"
                    }
                ]
            ]
        );
    }
);

test(
    "Word standardized document uses the same preparation boundary",
    async () => {
        const calls = [];

        const standardDocument = {
            sourceType:
                "word",
            documentType:
                "support_record"
        };

        const service =
            new LocalSemanticRecordPreparationService({
                standardizationPipeline: {
                    async processRegisteredFile(
                        fileName
                    ) {
                        calls.push([
                            "pipeline",
                            fileName
                        ]);

                        return createPipelineResult({
                            sourceDocumentKey:
                                "doc-key-word",
                            standardDocument
                        });
                    }
                },

                semanticRecordBuilder: {
                    build(
                        document,
                        trustedContext
                    ) {
                        calls.push([
                            "build",
                            document,
                            trustedContext
                        ]);

                        return [
                            "semantic-record"
                        ];
                    }
                }
            });

        const result =
            await service.prepareRegisteredFile(
                "record.docx"
            );

        assert.deepStrictEqual(
            result,
            [
                "semantic-record"
            ]
        );

        assert.deepStrictEqual(
            calls.map(
                value => value[0]
            ),
            [
                "pipeline",
                "build"
            ]
        );
    }
);

test(
    "pipeline rejection stops semantic building",
    async () => {
        let built = false;

        const service =
            new LocalSemanticRecordPreparationService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        throw new Error(
                            "unsupported file type"
                        );
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        built = true;

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
            built,
            false
        );
    }
);

test(
    "missing sourceDocumentKey fails before semantic building",
    async () => {
        let built = false;

        const service =
            new LocalSemanticRecordPreparationService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        return {
                            source: {},
                            validation: {
                                valid: true
                            },
                            quality: {
                                acceptable: true
                            },
                            standardDocument: {}
                        };
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        built = true;

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
            built,
            false
        );
    }
);

test(
    "sourceDocumentKey is never taken from standard document",
    async () => {
        let trustedContext;

        const standardDocument = {
            sourceType:
                "excel",
            documentType:
                "support_record",
            sourceDocumentKey:
                "client-controlled-key"
        };

        const service =
            new LocalSemanticRecordPreparationService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        return createPipelineResult({
                            sourceDocumentKey:
                                "trusted-document-key",
                            standardDocument
                        });
                    }
                },

                semanticRecordBuilder: {
                    build(
                        document,
                        context
                    ) {
                        trustedContext =
                            context;

                        assert.strictEqual(
                            document
                                .sourceDocumentKey,
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
    }
);
