"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const SemanticStoragePolicy =
    require("./SemanticStoragePolicy");

test("matched + resolved is only a confirmed candidate", () => {
    const policy =
        new SemanticStoragePolicy();

    assert.deepStrictEqual(
        policy.evaluate({
            residentMatching: {
                status: "matched",
                residentId: "resident-1"
            },
            semanticPipeline: {
                status: "resolved",
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
});

test("matched without confirmed residentId is rejected", () => {
    const policy =
        new SemanticStoragePolicy();

    for (const residentId of [
        undefined,
        null,
        "",
        "   ",
        123,
        {},
        []
    ]) {
        assert.deepStrictEqual(
            policy.evaluate({
                residentMatching: {
                    status: "matched",
                    ...(residentId !== undefined
                        ? { residentId }
                        : {})
                },
                semanticPipeline: {
                    status: "resolved",
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
    }
});

test("confirmed candidate does not depend on client-like resident fields", () => {
    const policy =
        new SemanticStoragePolicy();

    const result =
        policy.evaluate({
            residentMatching: {
                status: "matched",
                residentId: "resident-server",
                clientResidentId: "resident-client",
                sourceResidentId: "resident-source"
            },
            semanticPipeline: {
                status: "resolved",
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

test("matched + new candidate is a confirmed candidate", () => {
    const policy =
        new SemanticStoragePolicy();

    assert.deepStrictEqual(
        policy.evaluate({
            residentMatching: {
                status: "matched",
                residentId: "resident-1"
            },
            semanticPipeline: {
                status: "new_candidate",
                identityResolution: {
                    status: "new_candidate"
                }
            }
        }),
        {
            status: "confirmed_candidate"
        }
    );
});

test("missing source record identity remains pending review", () => {
    const policy =
        new SemanticStoragePolicy();

    assert.deepStrictEqual(
        policy.evaluate({
            residentMatching: {
                status: "matched",
                residentId: "resident-1"
            },
            semanticPipeline: {
                status: "pending_review",
                identityResolution: {
                    status: "pending_review"
                }
            }
        }),
        {
            status: "pending_review"
        }
    );
});

test("record identity conflict remains conflict", () => {
    const policy =
        new SemanticStoragePolicy();

    assert.deepStrictEqual(
        policy.evaluate({
            residentMatching: {
                status: "matched",
                residentId: "resident-1"
            },
            semanticPipeline: {
                status: "conflict",
                identityResolution: {
                    status: "conflict"
                }
            }
        }),
        {
            status: "conflict"
        }
    );
});

test("resident needs review overrides resolved record identity", () => {
    const policy =
        new SemanticStoragePolicy();

    assert.deepStrictEqual(
        policy.evaluate({
            residentMatching: {
                status: "needs_review"
            },
            semanticPipeline: {
                status: "resolved",
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        }),
        {
            status: "pending_review"
        }
    );
});

test("unmatched resident cannot become confirmed", () => {
    const policy =
        new SemanticStoragePolicy();

    assert.deepStrictEqual(
        policy.evaluate({
            residentMatching: {
                status: "unmatched"
            },
            semanticPipeline: {
                status: "resolved",
                identityResolution: {
                    status: "resolved",
                    recordId: "record-1"
                }
            }
        }),
        {
            status: "pending_review"
        }
    );
});

test("invalid semantic pipeline is rejected", () => {
    const policy =
        new SemanticStoragePolicy();

    assert.deepStrictEqual(
        policy.evaluate({
            residentMatching: {
                status: "matched",
                residentId: "resident-1"
            },
            semanticPipeline: {
                status: "invalid",
                errorCode:
                    "semantic_identity_resolution_invalid"
            }
        }),
        {
            status: "rejected"
        }
    );
});

test("malformed or unknown inputs fail closed", () => {
    const policy =
        new SemanticStoragePolicy();

    for (const input of [
        undefined,
        null,
        {},
        {
            residentMatching: {
                status: "something_else"
            },
            semanticPipeline: {
                status: "resolved"
            }
        },
        {
            residentMatching: {
                status: "matched",
                residentId: "resident-1"
            },
            semanticPipeline: {
                status: "something_else"
            }
        }
    ]) {
        assert.deepStrictEqual(
            policy.evaluate(input),
            {
                status: "rejected"
            }
        );
    }
});

test("resolved semantic identity without recordId is rejected", () => {
    const policy =
        new SemanticStoragePolicy();

    for (const identityResolution of [
        undefined,
        null,
        {},
        {
            status: "resolved"
        },
        {
            status: "resolved",
            recordId: ""
        },
        {
            status: "resolved",
            recordId: "   "
        },
        {
            status: "pending_review",
            recordId: "record-1"
        }
    ]) {
        assert.deepStrictEqual(
            policy.evaluate({
                residentMatching: {
                    status: "matched"
                },
                semanticPipeline: {
                    status: "resolved",
                    identityResolution
                }
            }),
            {
                status: "rejected"
            }
        );
    }
});
