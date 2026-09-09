"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticRecordPipeline =
    require("./SemanticRecordPipeline");

test("validated and processed record without sourceRecordKey remains pending review", () => {
    const calls = [];

    const semanticRecordValidator = {
        validate(record) {
            calls.push(["validate", record]);

            return {
                status: "valid",
                validatedSemanticRecord: record
            };
        }
    };

    const semanticContentProcessor = {
        process(record) {
            calls.push(["process", record]);

            return {
                status: "processed",
                processedSemanticRecord: {
                    ...record,
                    contentHash: "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                }
            };
        }
    };

    const recordIdentityResolver = {
        resolve(identityContext) {
            calls.push([
                "resolve",
                identityContext
            ]);

            assert.deepStrictEqual(
                identityContext,
                {
                    verifiedFacilityId:
                        "facility-1",
                    verifiedConnectorId:
                        "connector-1",
                    sourceDocumentKey:
                        "document-key-1"
                }
            );

            return {
                status: "pending_review"
            };
        }
    };

    const pipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator,
            semanticContentProcessor,
            recordIdentityResolver
        });

    const semanticRecord = {
        sourceRecordContext: {
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
            sourceDocumentKey:
                "document-key-1",
            documentType:
                "support_record",
            sourceType:
                "word"
        }
    };

    const result =
        pipeline.process({
            verifiedContext: {
                connectorId:
                    "connector-1",
                facilityId:
                    "facility-1"
            },
            semanticRecord
        });

    assert.deepStrictEqual(
        result.identityResolution,
        {
            status: "pending_review"
        }
    );

    assert.strictEqual(
        result.status,
        "pending_review"
    );

    assert.strictEqual(
        result.processedSemanticRecord
            .contentHash,
        "a".repeat(64)
    );

    assert.deepStrictEqual(
        calls.map(([name]) => name),
        [
            "validate",
            "process",
            "resolve"
        ]
    );
});

test("invalid validation short-circuits processing and identity resolution", () => {
    let processorCalled = false;
    let resolverCalled = false;

    const pipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator: {
                validate() {
                    return {
                        status: "invalid",
                        errorCode:
                            "semantic_support_content_invalid"
                    };
                }
            },
            semanticContentProcessor: {
                process() {
                    processorCalled = true;
                }
            },
            recordIdentityResolver: {
                resolve() {
                    resolverCalled = true;
                }
            }
        });

    const result =
        pipeline.process({
            verifiedContext: {
                connectorId: "connector-1",
                facilityId: "facility-1"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "semantic_support_content_invalid"
        }
    );

    assert.strictEqual(
        processorCalled,
        false
    );

    assert.strictEqual(
        resolverCalled,
        false
    );
});

test("processing failure short-circuits identity resolution", () => {
    let resolverCalled = false;

    const pipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator: {
                validate(record) {
                    return {
                        status: "valid",
                        validatedSemanticRecord:
                            record
                    };
                }
            },
            semanticContentProcessor: {
                process() {
                    return {
                        status: "invalid",
                        errorCode:
                            "semantic_hashing_failed"
                    };
                }
            },
            recordIdentityResolver: {
                resolve() {
                    resolverCalled = true;
                }
            }
        });

    const result =
        pipeline.process({
            verifiedContext: {
                connectorId: "connector-1",
                facilityId: "facility-1"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "semantic_hashing_failed"
        }
    );

    assert.strictEqual(
        resolverCalled,
        false
    );
});

test("dependency exceptions fail closed without exposing messages", () => {
    for (const failingDependency of [
        "validator",
        "processor",
        "resolver"
    ]) {
        const semanticRecordValidator = {
            validate(record) {
                if (
                    failingDependency ===
                    "validator"
                ) {
                    throw new Error(
                        "sensitive validator detail"
                    );
                }

                return {
                    status: "valid",
                    validatedSemanticRecord:
                        record
                };
            }
        };

        const semanticContentProcessor = {
            process(record) {
                if (
                    failingDependency ===
                    "processor"
                ) {
                    throw new Error(
                        "sensitive processor detail"
                    );
                }

                return {
                    status: "processed",
                    processedSemanticRecord: {
                        ...record,
                        provenance: {
                            sourceDocumentKey:
                                "document-key-1"
                        },
                        contentHash:
                            "a".repeat(64),
                        processingMetadata: {
                            canonicalizationVersion:
                                "risen-semantic-canonicalization-1"
                        }
                    }
                };
            }
        };

        const recordIdentityResolver = {
            resolve() {
                if (
                    failingDependency ===
                    "resolver"
                ) {
                    throw new Error(
                        "sensitive resolver detail"
                    );
                }

                return {
                    status: "pending_review"
                };
            }
        };

        const pipeline =
            new SemanticRecordPipeline({
                semanticRecordValidator,
                semanticContentProcessor,
                recordIdentityResolver
            });

        let result;

        assert.doesNotThrow(() => {
            result =
                pipeline.process({
                    verifiedContext: {
                        connectorId:
                            "connector-1",
                        facilityId:
                            "facility-1"
                    },
                    semanticRecord: {
                        provenance: {
                            sourceDocumentKey:
                                "document-key-1"
                        }
                    }
                });
        });

        assert.deepStrictEqual(
            result,
            {
                status: "invalid",
                errorCode:
                    "semantic_pipeline_unavailable"
            },
            failingDependency
        );

        assert.strictEqual(
            JSON.stringify(result)
                .includes("sensitive"),
            false
        );
    }
});

test("missing verified context does not invent trusted identity", () => {
    let receivedIdentityContext;

    const pipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator: {
                validate(record) {
                    return {
                        status: "valid",
                        validatedSemanticRecord:
                            record
                    };
                }
            },
            semanticContentProcessor: {
                process(record) {
                    return {
                        status: "processed",
                        processedSemanticRecord:
                            record
                    };
                }
            },
            recordIdentityResolver: {
                resolve(identityContext) {
                    receivedIdentityContext =
                        identityContext;

                    return {
                        status: "pending_review"
                    };
                }
            }
        });

    const result =
        pipeline.process({
            semanticRecord: {
                provenance: {
                    sourceDocumentKey:
                        "document-key-1"
                }
            }
        });

    assert.deepStrictEqual(
        receivedIdentityContext,
        {
            verifiedFacilityId:
                undefined,
            verifiedConnectorId:
                undefined,
            sourceDocumentKey:
                "document-key-1"
        }
    );

    assert.strictEqual(
        result.status,
        "pending_review"
    );
});

test("malformed identity resolution fails closed", () => {
    const malformedResults = [
        null,
        undefined,
        [],
        {},
        { status: "" },
        { status: 123 }
    ];

    for (const malformedResult of malformedResults) {
        const pipeline =
            new SemanticRecordPipeline({
                semanticRecordValidator: {
                    validate(record) {
                        return {
                            status: "valid",
                            validatedSemanticRecord:
                                record
                        };
                    }
                },
                semanticContentProcessor: {
                    process(record) {
                        return {
                            status: "processed",
                            processedSemanticRecord:
                                record
                        };
                    }
                },
                recordIdentityResolver: {
                    resolve() {
                        return malformedResult;
                    }
                }
            });

        const result =
            pipeline.process({
                verifiedContext: {
                    connectorId:
                        "connector-1",
                    facilityId:
                        "facility-1"
                },
                semanticRecord: {
                    provenance: {
                        sourceDocumentKey:
                            "document-key-1"
                    }
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status: "invalid",
                errorCode:
                    "semantic_identity_resolution_invalid"
            }
        );
    }
});

test("unknown identity resolution status fails closed", () => {
    const pipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator: {
                validate(record) {
                    return {
                        status: "valid",
                        validatedSemanticRecord:
                            record
                    };
                }
            },
            semanticContentProcessor: {
                process(record) {
                    return {
                        status: "processed",
                        processedSemanticRecord:
                            record
                    };
                }
            },
            recordIdentityResolver: {
                resolve() {
                    return {
                        status:
                            "unexpected_status"
                    };
                }
            }
        });

    const result =
        pipeline.process({
            verifiedContext: {
                connectorId:
                    "connector-1",
                facilityId:
                    "facility-1"
            },
            semanticRecord: {
                provenance: {
                    sourceDocumentKey:
                        "document-key-1"
                }
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "semantic_identity_resolution_invalid"
        }
    );
});

test("invalid identity resolution returns minimal failure without semantic record", () => {
    const pipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator: {
                validate(record) {
                    return {
                        status: "valid",
                        validatedSemanticRecord:
                            record
                    };
                }
            },
            semanticContentProcessor: {
                process(record) {
                    return {
                        status: "processed",
                        processedSemanticRecord: {
                            ...record,
                            contentHash:
                                "a".repeat(64)
                        }
                    };
                }
            },
            recordIdentityResolver: {
                resolve() {
                    return {
                        status: "invalid"
                    };
                }
            }
        });

    const result =
        pipeline.process({
            verifiedContext: {
                connectorId:
                    "connector-1",
                facilityId:
                    "facility-1"
            },
            semanticRecord: {
                semanticContent: {
                    semanticType:
                        "support_record",
                    fields: {
                        supportContent:
                            "sensitive semantic content"
                    },
                    customFields: {}
                },
                provenance: {
                    sourceDocumentKey:
                        "document-key-1"
                }
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "invalid",
            errorCode:
                "semantic_identity_resolution_invalid"
        }
    );

    assert.strictEqual(
        Object.hasOwn(
            result,
            "processedSemanticRecord"
        ),
        false
    );

    assert.strictEqual(
        Object.hasOwn(
            result,
            "identityResolution"
        ),
        false
    );

    assert.strictEqual(
        JSON.stringify(result)
            .includes(
                "sensitive semantic content"
            ),
        false
    );
});
