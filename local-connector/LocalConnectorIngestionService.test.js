"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const LocalConnectorIngestionService =
    require("./LocalConnectorIngestionService");

function createSemanticRecord(
    sourceDocumentKey = "document-key-123"
) {
    return {
        sourceRecordContext: {
            sourceRecordKey:
                "support_record:primary",
            sourceResidentIdentifier:
                "RES-123"
        },
        semanticContent: {
            semanticType:
                "support_record",
            fields: {
                supportContent:
                    "支援内容"
            },
            customFields: {}
        },
        provenance: {
            documentType:
                "support_record",
            sourceDocumentKey,
            fileName:
                "record.docx",
            sourceUpdatedAt:
                "2026-09-09T10:00:00Z",
            sourceType:
                "word"
        }
    };
}

test("requires localConnectorService", () => {
    assert.throws(
        () =>
            new LocalConnectorIngestionService({
                payloadBuilder: {
                    build() {}
                },
                semanticRecordBuilder: {
                    build() {}
                },
                httpClient: {
                    ingest() {}
                }
            }),
        /requires localConnectorService/
    );
});

test("requires payloadBuilder", () => {
    assert.throws(
        () =>
            new LocalConnectorIngestionService({
                localConnectorService: {},
                semanticRecordBuilder: {
                    build() {}
                },
                httpClient: {
                    ingest() {}
                }
            }),
        /requires payloadBuilder/
    );
});

test("requires semanticRecordBuilder", () => {
    assert.throws(
        () =>
            new LocalConnectorIngestionService({
                localConnectorService: {},
                payloadBuilder: {
                    build() {}
                },
                httpClient: {
                    ingest() {}
                }
            }),
        /requires semanticRecordBuilder/
    );
});

test("requires httpClient", () => {
    assert.throws(
        () =>
            new LocalConnectorIngestionService({
                localConnectorService: {},
                payloadBuilder: {
                    build() {}
                },
                semanticRecordBuilder: {
                    build() {}
                }
            }),
        /requires httpClient/
    );
});

test(
    "processes one standardized document, builds both lanes, then sends envelope",
    async () => {
        const calls = [];

        const standardDocument = {
            documentType:
                "support_record",
            sourceType:
                "word",
            source: {
                fileName:
                    "record.docx",
                updatedAt:
                    "2026-09-09T10:00:00Z"
            },
            extracted: {
                sourceResidentIdentifier: {
                    value:
                        "RES-123"
                },
                supportContent: {
                    value:
                        "支援内容"
                }
            }
        };

        const payload = {
            sourceResident: {
                identifier: {
                    value:
                        "RES-123"
                }
            },
            source: {
                fileName:
                    "record.docx",
                updatedAt:
                    "2026-09-09T10:00:00Z"
            },
            documentType:
                "support_record",
            sourceType:
                "word"
        };

        const semanticRecord =
            createSemanticRecord();

        const service =
            new LocalConnectorIngestionService({
                standardizationPipeline: {
                    async processRegisteredFile(
                        fileName
                    ) {
                        calls.push([
                            "pipeline",
                            fileName
                        ]);

                        return {
                            source: {
                                sourceDocumentKey:
                                    "document-key-123"
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
                },

                payloadBuilder: {
                    build(input) {
                        calls.push([
                            "buildPayload",
                            input
                        ]);

                        return payload;
                    }
                },

                semanticRecordBuilder: {
                    build(
                        input,
                        trustedContext
                    ) {
                        calls.push([
                            "buildSemantic",
                            input,
                            trustedContext
                        ]);

                        return [
                            semanticRecord
                        ];
                    }
                },

                httpClient: {
                    async ingest(input) {
                        calls.push([
                            "ingest",
                            input
                        ]);

                        return {
                            requestId:
                                "request-123",
                            status:
                                "matched"
                        };
                    }
                }
            });

        const result =
            await service.ingestRegisteredFile(
                "record.docx"
            );

        assert.deepStrictEqual(
            result,
            {
                requestId:
                    "request-123",
                status:
                    "matched"
            }
        );

        assert.deepStrictEqual(
            calls,
            [
                [
                    "pipeline",
                    "record.docx"
                ],
                [
                    "buildPayload",
                    standardDocument
                ],
                [
                    "buildSemantic",
                    standardDocument,
                    {
                        sourceDocumentKey:
                            "document-key-123"
                    }
                ],
                [
                    "ingest",
                    {
                        payload,
                        semanticRecords: [
                            semanticRecord
                        ]
                    }
                ]
            ]
        );
    }
);

test(
    "Excel standardized document uses the same ingestion boundary",
    async () => {
        let pipelineCount = 0;
        let httpCount = 0;

        const service =
            new LocalConnectorIngestionService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        pipelineCount += 1;

                        return {
                            source: {
                                sourceDocumentKey:
                                    "excel-document-key"
                            },
                            validation: {
                                valid: true
                            },
                            quality: {
                                acceptable: true
                            },
                            standardDocument: {
                                documentType:
                                    "support_record",
                                sourceType:
                                    "excel",
                                source: {
                                    fileName:
                                        "record.xlsx",
                                    updatedAt:
                                        "2026-09-09T10:00:00Z"
                                },
                                extracted: {
                                    supportContent: {
                                        value:
                                            "Excel支援内容"
                                    }
                                }
                            }
                        };
                    }
                },

                payloadBuilder: {
                    build() {
                        return {
                            sourceResident: {
                                identifier: {
                                    value:
                                        "RES-456"
                                }
                            }
                        };
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        return [
                            createSemanticRecord(
                                "excel-document-key"
                            )
                        ];
                    }
                },

                httpClient: {
                    async ingest() {
                        httpCount += 1;

                        return {
                            requestId:
                                "request-456",
                            status:
                                "unmatched"
                        };
                    }
                }
            });

        await service.ingestRegisteredFile(
            "record.xlsx"
        );

        assert.strictEqual(
            pipelineCount,
            1
        );

        assert.strictEqual(
            httpCount,
            1
        );
    }
);

test(
    "missing sourceDocumentKey fails before builders and HTTP",
    async () => {
        let payloadBuilt = false;
        let semanticBuilt = false;
        let httpCalled = false;

        const service =
            new LocalConnectorIngestionService({
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

                payloadBuilder: {
                    build() {
                        payloadBuilt = true;
                        return {};
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        semanticBuilt = true;
                        return [];
                    }
                },

                httpClient: {
                    async ingest() {
                        httpCalled = true;
                    }
                }
            });

        await assert.rejects(
            () =>
                service.ingestRegisteredFile(
                    "record.docx"
                ),
            /sourceDocumentKey unavailable/
        );

        assert.strictEqual(
            payloadBuilt,
            false
        );
        assert.strictEqual(
            semanticBuilt,
            false
        );
        assert.strictEqual(
            httpCalled,
            false
        );
    }
);

test(
    "pipeline rejection stops builders and HTTP",
    async () => {
        let payloadBuilt = false;
        let semanticBuilt = false;
        let httpCalled = false;

        const service =
            new LocalConnectorIngestionService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        throw new Error(
                            "unsupported file type"
                        );
                    }
                },

                payloadBuilder: {
                    build() {
                        payloadBuilt = true;
                        return {};
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        semanticBuilt = true;
                        return [];
                    }
                },

                httpClient: {
                    async ingest() {
                        httpCalled = true;
                    }
                }
            });

        await assert.rejects(
            () =>
                service.ingestRegisteredFile(
                    "record.pdf"
                ),
            /unsupported file type/
        );

        assert.strictEqual(
            payloadBuilt,
            false
        );
        assert.strictEqual(
            semanticBuilt,
            false
        );
        assert.strictEqual(
            httpCalled,
            false
        );
    }
);

test(
    "missing ingestion payload fails before semantic build and HTTP",
    async () => {
        let semanticBuilt = false;
        let httpCalled = false;

        const service =
            new LocalConnectorIngestionService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        return {
                            source: {
                                sourceDocumentKey:
                                    "document-key"
                            },
                            validation: {
                                valid: true
                            },
                            quality: {
                                acceptable: true
                            },
                            standardDocument: {
                                sourceType:
                                    "word",
                                documentType:
                                    "support_record"
                            }
                        };
                    }
                },

                payloadBuilder: {
                    build() {
                        return null;
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        semanticBuilt = true;
                        return [];
                    }
                },

                httpClient: {
                    async ingest() {
                        httpCalled = true;
                    }
                }
            });

        await assert.rejects(
            () =>
                service.ingestRegisteredFile(
                    "record.docx"
                ),
            /ingestion payload unavailable/
        );

        assert.strictEqual(
            semanticBuilt,
            false
        );

        assert.strictEqual(
            httpCalled,
            false
        );
    }
);

test(
    "missing semantic records fails before HTTP",
    async () => {
        let httpCalled = false;

        const service =
            new LocalConnectorIngestionService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        return {
                            source: {
                                sourceDocumentKey:
                                    "document-key"
                            },
                            validation: {
                                valid: true
                            },
                            quality: {
                                acceptable: true
                            },
                            standardDocument: {
                                sourceType:
                                    "word",
                                documentType:
                                    "support_record"
                            }
                        };
                    }
                },

                payloadBuilder: {
                    build() {
                        return {
                            sourceResident: {
                                identifier: {
                                    value:
                                        "RES-123"
                                }
                            }
                        };
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        return [];
                    }
                },

                httpClient: {
                    async ingest() {
                        httpCalled = true;
                    }
                }
            });

        await assert.rejects(
            () =>
                service.ingestRegisteredFile(
                    "record.docx"
                ),
            /semantic records unavailable/
        );

        assert.strictEqual(
            httpCalled,
            false
        );
    }
);

test(
    "facilityId residentId verifiedContext and credential are never added to JSON envelope",
    async () => {
        let sentEnvelope;

        const service =
            new LocalConnectorIngestionService({
                standardizationPipeline: {
                    async processRegisteredFile() {
                        return {
                            source: {
                                sourceDocumentKey:
                                    "document-key-safe"
                            },
                            validation: {
                                valid: true
                            },
                            quality: {
                                acceptable: true
                            },
                            standardDocument: {
                                facilityId:
                                    "client-facility",
                                residentId:
                                    "client-resident",
                                verifiedContext: {
                                    facilityId:
                                        "fake-facility"
                                },
                                credential:
                                    "fake-credential",
                                documentType:
                                    "support_record",
                                sourceType:
                                    "word",
                                source: {
                                    fileName:
                                        "record.docx",
                                    updatedAt:
                                        "2026-09-09T10:00:00Z"
                                },
                                extracted: {
                                    sourceResidentIdentifier: {
                                        value:
                                            "RES-123"
                                    },
                                    supportContent: {
                                        value:
                                            "支援内容"
                                    }
                                }
                            }
                        };
                    }
                },

                payloadBuilder: {
                    build() {
                        return {
                            sourceResident: {
                                identifier: {
                                    value:
                                        "RES-123"
                                }
                            }
                        };
                    }
                },

                semanticRecordBuilder: {
                    build() {
                        return [
                            createSemanticRecord(
                                "document-key-safe"
                            )
                        ];
                    }
                },

                httpClient: {
                    async ingest(input) {
                        sentEnvelope =
                            input;

                        return {
                            requestId:
                                "request-789",
                            status:
                                "matched"
                        };
                    }
                }
            });

        await service.ingestRegisteredFile(
            "record.docx"
        );

        const serialized =
            JSON.stringify(
                sentEnvelope
            );

        assert.strictEqual(
            serialized.includes(
                "client-facility"
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "client-resident"
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "fake-facility"
            ),
            false
        );

        assert.strictEqual(
            serialized.includes(
                "fake-credential"
            ),
            false
        );
    }
);
