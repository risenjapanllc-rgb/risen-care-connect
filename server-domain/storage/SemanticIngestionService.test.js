"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticIngestionService =
    require("./SemanticIngestionService");

function createService({
    pipeline,
    decisionService
} = {}) {
    return new SemanticIngestionService({
        semanticRecordPipeline:
            pipeline || {
                process() {
                    return {
                        status:
                            "pending_review"
                    };
                }
            },
        semanticStorageDecisionService:
            decisionService || {
                async decide() {
                    return {
                        status:
                            "pending_review"
                    };
                }
            }
    });
}

test("passes trusted context and semantic record through pipeline into storage decision", async () => {
    const verifiedContext = {
        connectorId: "connector-1",
        facilityId: "facility-1"
    };

    const residentMatching = {
        status: "matched"
    };

    const semanticRecord = {
        semanticContent: {
            semanticType:
                "support_record",
            fields: {
                supportContent:
                    "支援内容"
            },
            customFields: {}
        }
    };

    let pipelineInput;
    let decisionInput;

    const semanticPipelineResult = {
        status: "new_candidate",
        processedSemanticRecord: {
            semanticContent: {
                semanticType:
                    "support_record"
            }
        },
        identityResolution: {
            status:
                "new_candidate"
        }
    };

    const service = createService({
        pipeline: {
            process(input) {
                pipelineInput = input;
                return semanticPipelineResult;
            }
        },
        decisionService: {
            async decide(input) {
                decisionInput = input;
                return {
                    status:
                        "pending_review"
                };
            }
        }
    });

    const result =
        await service.ingest({
            verifiedContext,
            residentMatching,
            semanticRecord
        });

    assert.deepStrictEqual(
        pipelineInput,
        {
            verifiedContext,
            semanticRecord
        }
    );

    assert.deepStrictEqual(
        decisionInput,
        {
            verifiedContext,
            residentMatching,
            semanticPipeline:
                semanticPipelineResult
        }
    );

    assert.deepStrictEqual(
        result,
        {
            status:
                "pending_review"
        }
    );
});

test("semantic pipeline failure fails closed before storage decision", async () => {
    let decisionCalls = 0;

    const service = createService({
        pipeline: {
            process() {
                throw new Error(
                    "sensitive pipeline failure"
                );
            }
        },
        decisionService: {
            async decide() {
                decisionCalls += 1;
                return {
                    status:
                        "confirmed_candidate"
                };
            }
        }
    });

    const result =
        await service.ingest({
            verifiedContext: {
                connectorId:
                    "connector-1",
                facilityId:
                    "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        decisionCalls,
        0
    );

    assert.strictEqual(
        JSON.stringify(result).includes(
            "sensitive"
        ),
        false
    );
});

test("storage decision failure is sanitized", async () => {
    const service = createService({
        decisionService: {
            async decide() {
                throw new Error(
                    "database secret failure"
                );
            }
        }
    });

    const result =
        await service.ingest({
            verifiedContext: {
                connectorId:
                    "connector-1",
                facilityId:
                    "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        JSON.stringify(result).includes(
            "secret"
        ),
        false
    );
});

test("constructor requires both semantic dependencies", () => {
    assert.throws(
        () =>
            new SemanticIngestionService({
                semanticRecordPipeline: {
                    process() {}
                }
            }),
        /semanticStorageDecisionService/
    );

    assert.throws(
        () =>
            new SemanticIngestionService({
                semanticStorageDecisionService: {
                    async decide() {}
                }
            }),
        /semanticRecordPipeline/
    );
});

test("unknown semantic pipeline status fails closed before storage decision", async () => {
    let decisionCalls = 0;

    const service = createService({
        pipeline: {
            process() {
                return {
                    status: "unexpected_pipeline_status"
                };
            }
        },
        decisionService: {
            async decide() {
                decisionCalls += 1;
                return {
                    status: "confirmed_candidate"
                };
            }
        }
    });

    const result =
        await service.ingest({
            verifiedContext: {
                connectorId: "connector-1",
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        decisionCalls,
        0
    );
});

test("semantic pipeline result without status fails closed before storage decision", async () => {
    let decisionCalls = 0;

    const service = createService({
        pipeline: {
            process() {
                return {};
            }
        },
        decisionService: {
            async decide() {
                decisionCalls += 1;
                return {
                    status: "confirmed_candidate"
                };
            }
        }
    });

    const result =
        await service.ingest({
            verifiedContext: {
                connectorId: "connector-1",
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        decisionCalls,
        0
    );
});

test("unknown storage decision status fails closed", async () => {
    const service = createService({
        decisionService: {
            async decide() {
                return {
                    status: "unexpected_storage_status"
                };
            }
        }
    });

    const result =
        await service.ingest({
            verifiedContext: {
                connectorId: "connector-1",
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );
});

test("blank storage decision status fails closed", async () => {
    const service = createService({
        decisionService: {
            async decide() {
                return {
                    status: "   "
                };
            }
        }
    });

    const result =
        await service.ingest({
            verifiedContext: {
                connectorId: "connector-1",
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticRecord: {}
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );
});
