"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorResidentCandidateHttpAdapter =
    require("./ConnectorResidentCandidateHttpAdapter");

test("returns resident candidates from the candidate service", async () => {
    let serviceInput = null;

    const adapter =
        new ConnectorResidentCandidateHttpAdapter({
            candidateService: {
                async findCandidates(input) {
                    serviceInput = input;

                    return {
                        status: "ok",
                        candidates: [
                            {
                                residentId: "resident-1",
                                userCode: "U001",
                                name: "Example User"
                            }
                        ]
                    };
                }
            }
        });

    const result =
        await adapter.handle({
            requestId: "request-1",
            connectorId: "connector-1",
            credential: "credential-1",
            userCode: "U001"
        });

    assert.deepStrictEqual(
        serviceInput,
        {
            connectorId: "connector-1",
            credential: "credential-1",
            userCode: "U001",
            name: undefined
        }
    );

    assert.deepStrictEqual(
        result,
        {
            statusCode: 200,
            body: {
                status: "ok",
                candidates: [
                    {
                        residentId: "resident-1",
                        userCode: "U001",
                        name: "Example User"
                    }
                ]
            }
        }
    );
});

test("maps denied and invalid candidate results to safe HTTP responses", async () => {
    const deniedAdapter =
        new ConnectorResidentCandidateHttpAdapter({
            candidateService: {
                async findCandidates() {
                    return {
                        status: "denied"
                    };
                }
            }
        });

    const invalidAdapter =
        new ConnectorResidentCandidateHttpAdapter({
            candidateService: {
                async findCandidates() {
                    return {
                        status: "invalid"
                    };
                }
            }
        });

    const denied =
        await deniedAdapter.handle({
            requestId: "request-denied"
        });

    const invalid =
        await invalidAdapter.handle({
            requestId: "request-invalid"
        });

    assert.strictEqual(
        denied.statusCode,
        401
    );

    assert.strictEqual(
        denied.body.errorCode,
        "connector_trust_denied"
    );

    assert.strictEqual(
        invalid.statusCode,
        422
    );

    assert.strictEqual(
        invalid.body.errorCode,
        "resident_candidate_query_invalid"
    );
});

test("does not expose internal candidate service errors", async () => {
    const diagnostics = [];

    const adapter =
        new ConnectorResidentCandidateHttpAdapter({
            candidateService: {
                async findCandidates() {
                    return {
                        status: "error",
                        errorCode:
                            "internal_repository_detail"
                    };
                }
            },
            diagnosticLogger: {
                error(entry) {
                    diagnostics.push(entry);
                }
            }
        });

    const result =
        await adapter.handle({
            requestId: "request-1"
        });

    assert.strictEqual(
        result.statusCode,
        503
    );

    assert.strictEqual(
        result.body.errorCode,
        "connector_processing_unavailable"
    );

    assert.deepStrictEqual(
        diagnostics,
        [
            {
                requestId: "request-1",
                status: "error",
                internalErrorCode:
                    "internal_repository_detail"
            }
        ]
    );
});
