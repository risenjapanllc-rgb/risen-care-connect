"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticStorageDecisionService =
    require("./SemanticStorageDecisionService");

test("trusted matched new candidate produces explicit create candidate without record change lookup", async () => {
    let existingRecordCalls = 0;
    let recordChangeCalls = 0;

    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    existingRecordCalls += 1;
                    throw new Error(
                        "must not be called"
                    );
                }
            },
            recordChangeResolver: {
                resolve() {
                    recordChangeCalls += 1;
                    throw new Error(
                        "must not be called"
                    );
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    return {
                        status:
                            "confirmed_candidate"
                    };
                }
            }
        });

    const input = {
        verifiedContext: {
            facilityId:
                "facility-1",
            connectorId:
                "connector-1"
        },
        residentMatching: {
            status:
                "matched",
            residentId:
                "resident-1"
        },
        semanticPipeline: {
            status:
                "new_candidate",
            identityResolution: {
                status:
                    "new_candidate"
            },
            processedSemanticRecord: {
                provenance: {
                    sourceDocumentKey:
                        "document-1"
                },
                sourceRecordContext: {
                    sourceRecordKey:
                        "support_record:primary"
                }
            }
        }
    };

    assert.deepStrictEqual(
        await service.decideForPersistence(input),
        {
            decision: {
                status:
                    "confirmed_candidate"
            },
            recordCreation: {
                status:
                    "create_candidate",
                residentId:
                    "resident-1",
                sourceDocumentKey:
                    "document-1",
                sourceRecordKey:
                    "support_record:primary"
            }
        }
    );

    assert.deepStrictEqual(
        await service.decide(input),
        {
            status:
                "confirmed_candidate"
        }
    );

    assert.equal(existingRecordCalls, 0);
    assert.equal(recordChangeCalls, 0);
});

test("resolved identity calls record change resolver with allowlisted change context", async () => {
    const expectedHash =
        "b".repeat(64);

    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: "a".repeat(64),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve(input) {
                    assert.deepStrictEqual(
                        input,
                        {
                            identityResolution: {
                                status: "resolved",
                                recordId: "record-1"
                            },
                            existingRecordState: {
                                recordId: "record-1",
                                contentHash:
                                    "a".repeat(64),
                                canonicalizationVersion:
                                    "risen-semantic-canonicalization-1"
                            },
                            currentContentHash:
                                expectedHash,
                            currentCanonicalizationVersion:
                                "risen-semantic-canonicalization-1"
                        }
                    );

                    return {
                        status: "updated_candidate",
                        recordId: "record-1"
                    };
                }
            },
            semanticStoragePolicy: {
                evaluate(input) {
                    assert.deepStrictEqual(
                        input.recordChange,
                        {
                            status: "updated_candidate",
                            recordId: "record-1"
                        }
                    );

                    return {
                        status: "confirmed_candidate"
                    };
                }
            }
        });

    const result =
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline: {
                status: "resolved",
                processedSemanticRecord: {
                    contentHash:
                        expectedHash,
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                },
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "confirmed_candidate"
        }
    );
});

test("record change conflict does not become confirmed", async () => {
    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: "a".repeat(64),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve() {
                    return {
                        status: "conflict"
                    };
                }
            },
            semanticStoragePolicy: {
                evaluate(input) {
                    if (
                        input.recordChange?.status ===
                        "conflict"
                    ) {
                        return {
                            status: "conflict"
                        };
                    }

                    return {
                        status: "rejected"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline: {
                status: "resolved",
                processedSemanticRecord: {
                    contentHash:
                        "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                },
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        }),
        {
            status: "conflict"
        }
    );
});

test("record change invalid fails closed without exposing dependency error", async () => {
    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: "a".repeat(64),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve() {
                    return {
                        status: "invalid",
                        errorCode:
                            "sensitive_change_detail"
                    };
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    throw new Error(
                        "must not be called"
                    );
                }
            }
        });

    const result =
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline: {
                status: "resolved",
                processedSemanticRecord: {
                    contentHash:
                        "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                },
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        JSON.stringify(result)
            .includes(
                "sensitive_change_detail"
            ),
        false
    );
});

test("dependency exceptions fail closed", async () => {
    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: "a".repeat(64),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve() {
                    throw new Error(
                        "sensitive resolver detail"
                    );
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    return {
                        status: "confirmed_candidate"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline: {
                status: "resolved",
                processedSemanticRecord: {
                    contentHash:
                        "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                },
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        }),
        {
            status: "rejected"
        }
    );
});

test("only unchanged and updated record change candidates may reach storage policy for resolved identity", async () => {
    for (const allowedStatus of [
        "unchanged_candidate",
        "updated_candidate"
    ]) {
        let policyCalls = 0;

        const service =
            new SemanticStorageDecisionService({
                existingSemanticRecordRepository: {
                    async getByRecordId() {
                        return {
                            recordId: "record-1",
                            contentHash:
                                "a".repeat(64),
                            canonicalizationVersion:
                                "risen-semantic-canonicalization-1"
                        };
                    }
                },
                recordChangeResolver: {
                    resolve() {
                        return {
                            status: allowedStatus,
                            recordId: "record-1"
                        };
                    }
                },
                semanticStoragePolicy: {
                    evaluate(input) {
                        policyCalls += 1;

                        assert.strictEqual(
                            input.recordChange.status,
                            allowedStatus
                        );

                        return {
                            status: "confirmed_candidate"
                        };
                    }
                }
            });

        assert.deepStrictEqual(
            await service.decide({
                verifiedContext: {
                    facilityId: "facility-1"
                },
                residentMatching: {
                    status: "matched"
                },
                semanticPipeline: {
                    status: "resolved",
                    processedSemanticRecord: {
                        contentHash:
                            "a".repeat(64),
                        processingMetadata: {
                            canonicalizationVersion:
                                "risen-semantic-canonicalization-1"
                        }
                    },
                    identityResolution: {
                        status: "resolved",
                        recordId: "record-1"
                    }
                }
            }),
            {
                status: "confirmed_candidate"
            }
        );

        assert.strictEqual(
            policyCalls,
            1
        );
    }
});

test("incompatible record change fails closed before storage policy", async () => {
    let policyCalls = 0;

    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: "a".repeat(64),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve() {
                    return {
                        status: "incompatible",
                        recordId: "record-1"
                    };
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    policyCalls += 1;

                    return {
                        status: "confirmed_candidate"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline: {
                status: "resolved",
                processedSemanticRecord: {
                    contentHash:
                        "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                },
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        }),
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        policyCalls,
        0
    );
});

test("identity_not_resolved record change fails closed before storage policy", async () => {
    let policyCalls = 0;

    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: "a".repeat(64),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve() {
                    return {
                        status:
                            "identity_not_resolved"
                    };
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    policyCalls += 1;

                    return {
                        status: "confirmed_candidate"
                    };
                }
            }
        });

    const result =
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline: {
                status: "resolved",
                processedSemanticRecord: {
                    contentHash:
                        "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                },
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        policyCalls,
        0
    );
});

test("unknown record change status fails closed before storage policy", async () => {
    let policyCalls = 0;

    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: "a".repeat(64),
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve() {
                    return {
                        status:
                            "unexpected_change_status",
                        recordId: "record-1"
                    };
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    policyCalls += 1;

                    return {
                        status: "confirmed_candidate"
                    };
                }
            }
        });

    assert.deepStrictEqual(
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline: {
                status: "resolved",
                processedSemanticRecord: {
                    contentHash:
                        "a".repeat(64),
                    processingMetadata: {
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    }
                },
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        }),
        {
            status: "rejected"
        }
    );

    assert.strictEqual(
        policyCalls,
        0
    );
});

test("persistence decision preserves trusted updated record change without changing public decision", async () => {
    const expectedContentHash =
        "a".repeat(64);

    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash:
                            expectedContentHash,
                        canonicalizationVersion:
                            "risen-semantic-canonicalization-1"
                    };
                }
            },
            recordChangeResolver: {
                resolve(input) {
                    assert.strictEqual(
                        input.existingRecordState
                            .contentHash,
                        expectedContentHash
                    );

                    return {
                        status:
                            "updated_candidate",
                        recordId:
                            "record-1",
                        expectedContentHash
                    };
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    return {
                        status:
                            "confirmed_candidate"
                    };
                }
            }
        });

    const input = {
        verifiedContext: {
            facilityId:
                "facility-1"
        },
        residentMatching: {
            status:
                "matched",
            residentId:
                "resident-1"
        },
        semanticPipeline: {
            status:
                "resolved",
            processedSemanticRecord: {
                contentHash:
                    "b".repeat(64),
                processingMetadata: {
                    canonicalizationVersion:
                        "risen-semantic-canonicalization-1"
                }
            },
            identityResolution: {
                status:
                    "resolved",
                recordId:
                    "record-1"
            }
        }
    };

    assert.deepStrictEqual(
        await service.decideForPersistence(
            input
        ),
        {
            decision: {
                status:
                    "confirmed_candidate"
            },
            recordChange: {
                status:
                    "updated_candidate",
                recordId:
                    "record-1",
                expectedContentHash
            }
        }
    );

    assert.deepStrictEqual(
        await service.decide(input),
        {
            status:
                "confirmed_candidate"
        }
    );
});

test("new candidate missing trusted create context fails closed before policy or record lookup", async () => {
    let existingRecordCalls = 0;
    let recordChangeCalls = 0;
    let policyCalls = 0;

    const service =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository: {
                async getByRecordId() {
                    existingRecordCalls += 1;
                    throw new Error(
                        "must not be called"
                    );
                }
            },
            recordChangeResolver: {
                resolve() {
                    recordChangeCalls += 1;
                    throw new Error(
                        "must not be called"
                    );
                }
            },
            semanticStoragePolicy: {
                evaluate() {
                    policyCalls += 1;
                    return {
                        status:
                            "confirmed_candidate"
                    };
                }
            }
        });

    const result =
        await service.decideForPersistence({
            verifiedContext: {
                facilityId:
                    "facility-1"
            },
            residentMatching: {
                status:
                    "matched",
                residentId:
                    "resident-1"
            },
            semanticPipeline: {
                status:
                    "new_candidate",
                identityResolution: {
                    status:
                        "new_candidate"
                },
                processedSemanticRecord: {
                    sourceRecordContext: {
                        sourceDocumentKey:
                            "document-1",
                        sourceRecordKey:
                            "support_record:primary"
                    }
                }
            }
        });

    assert.deepStrictEqual(
        result,
        {
            decision: {
                status:
                    "rejected"
            }
        }
    );

    assert.equal(existingRecordCalls, 0);
    assert.equal(recordChangeCalls, 0);
    assert.equal(policyCalls, 0);
});
