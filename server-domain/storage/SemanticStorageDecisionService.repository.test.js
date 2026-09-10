"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticStorageDecisionService =
    require("./SemanticStorageDecisionService");

const HASH = "a".repeat(64);
const VERSION =
    "risen-semantic-canonicalization-1";

function createResolvedPipeline() {
    return {
        status: "resolved",
        processedSemanticRecord: {
            contentHash: HASH,
            processingMetadata: {
                canonicalizationVersion:
                    VERSION
            }
        },
        identityResolution: {
            status: "resolved",
            recordId: "record-1"
        }
    };
}

function createService({
    repository,
    resolver,
    policy
} = {}) {
    return new SemanticStorageDecisionService({
        existingSemanticRecordRepository:
            repository || {
                async getByRecordId() {
                    return {
                        recordId: "record-1",
                        contentHash: HASH,
                        canonicalizationVersion:
                            VERSION
                    };
                }
            },

        recordChangeResolver:
            resolver || {
                resolve() {
                    return {
                        status:
                            "unchanged_candidate",
                        recordId: "record-1"
                    };
                }
            },

        semanticStoragePolicy:
            policy || {
                evaluate() {
                    return {
                        status:
                            "confirmed_candidate"
                    };
                }
            }
    });
}

test("resolved identity loads existing state using verified facility and resolved recordId", async () => {
    const calls = [];

    const service = createService({
        repository: {
            async getByRecordId(input) {
                calls.push(input);

                return {
                    recordId: "record-1",
                    contentHash: HASH,
                    canonicalizationVersion:
                        VERSION,
                    secret: "must-not-propagate"
                };
            }
        },
        resolver: {
            resolve(input) {
                assert.deepStrictEqual(
                    input.existingRecordState,
                    {
                        recordId: "record-1",
                        contentHash: HASH,
                        canonicalizationVersion:
                            VERSION
                    }
                );

                return {
                    status:
                        "unchanged_candidate",
                    recordId: "record-1"
                };
            }
        }
    });

    const result =
        await service.decide({
            verifiedContext: {
                connectorId: "connector-1",
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline:
                createResolvedPipeline(),

            // Must be ignored after the repository
            // boundary is introduced.
            existingRecordState: {
                recordId: "attacker-record",
                contentHash: "b".repeat(64),
                canonicalizationVersion:
                    "attacker-version"
            },

            facilityId: "attacker-facility",
            recordId: "attacker-record"
        });

    assert.deepStrictEqual(
        calls,
        [
            {
                facilityId: "facility-1",
                recordId: "record-1"
            }
        ]
    );

    assert.deepStrictEqual(
        result,
        {
            status: "confirmed_candidate"
        }
    );
});

test("resolved identity without verified facility fails closed before repository", async () => {
    let repositoryCalls = 0;
    let resolverCalls = 0;
    let policyCalls = 0;

    const service = createService({
        repository: {
            async getByRecordId() {
                repositoryCalls += 1;
                return {};
            }
        },
        resolver: {
            resolve() {
                resolverCalls += 1;
                return {
                    status:
                        "unchanged_candidate"
                };
            }
        },
        policy: {
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
        await service.decide({
            verifiedContext: {
                connectorId: "connector-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline:
                createResolvedPipeline(),

            facilityId: "attacker-facility"
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(repositoryCalls, 0);
    assert.strictEqual(resolverCalls, 0);
    assert.strictEqual(policyCalls, 0);
});

test("resolved identity with missing repository record fails closed", async () => {
    let resolverCalls = 0;
    let policyCalls = 0;

    const service = createService({
        repository: {
            async getByRecordId() {
                return null;
            }
        },
        resolver: {
            resolve() {
                resolverCalls += 1;
                return {
                    status:
                        "unchanged_candidate"
                };
            }
        },
        policy: {
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
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline:
                createResolvedPipeline()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(resolverCalls, 0);
    assert.strictEqual(policyCalls, 0);
});

test("repository failure is sanitized and fails closed", async () => {
    let resolverCalls = 0;
    let policyCalls = 0;

    const service = createService({
        repository: {
            async getByRecordId() {
                throw new Error(
                    "database secret failure"
                );
            }
        },
        resolver: {
            resolve() {
                resolverCalls += 1;
                return {
                    status:
                        "unchanged_candidate"
                };
            }
        },
        policy: {
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
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline:
                createResolvedPipeline()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(resolverCalls, 0);
    assert.strictEqual(policyCalls, 0);

    assert.strictEqual(
        JSON.stringify(result).includes(
            "database secret failure"
        ),
        false
    );
});

test("non-resolved semantic status does not access existing record repository", async () => {
    let repositoryCalls = 0;

    const service = createService({
        repository: {
            async getByRecordId() {
                repositoryCalls += 1;
                return null;
            }
        },
        policy: {
            evaluate() {
                return {
                    status: "pending_review"
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
                status: "new_candidate"
            }
        });

    assert.deepStrictEqual(
        result,
        {
            status: "pending_review"
        }
    );

    assert.strictEqual(
        repositoryCalls,
        0
    );
});

test("unchanged candidate with missing recordId fails closed before storage policy", async () => {
    let policyCalls = 0;

    const service = createService({
        resolver: {
            resolve() {
                return {
                    status:
                        "unchanged_candidate"
                };
            }
        },
        policy: {
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
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline:
                createResolvedPipeline()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(policyCalls, 0);
});

test("updated candidate with blank recordId fails closed before storage policy", async () => {
    let policyCalls = 0;

    const service = createService({
        resolver: {
            resolve() {
                return {
                    status:
                        "updated_candidate",
                    recordId: "   "
                };
            }
        },
        policy: {
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
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline:
                createResolvedPipeline()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(policyCalls, 0);
});

test("record change candidate for different recordId fails closed before storage policy", async () => {
    let policyCalls = 0;

    const service = createService({
        resolver: {
            resolve() {
                return {
                    status:
                        "updated_candidate",
                    recordId:
                        "different-record"
                };
            }
        },
        policy: {
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
        await service.decide({
            verifiedContext: {
                facilityId: "facility-1"
            },
            residentMatching: {
                status: "matched"
            },
            semanticPipeline:
                createResolvedPipeline()
        });

    assert.deepStrictEqual(
        result,
        {
            status: "rejected"
        }
    );

    assert.strictEqual(policyCalls, 0);
});
