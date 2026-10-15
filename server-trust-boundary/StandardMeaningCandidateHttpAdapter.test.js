"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const StandardMeaningCandidateHttpAdapter =
    require(
        "./StandardMeaningCandidateHttpAdapter"
    );

test(
    "returns successful candidate ingestion result",
    async () => {
        const adapter =
            new StandardMeaningCandidateHttpAdapter({
                ingestionService: {
                    async ingest() {
                        return {
                            status: "created",
                            candidateId:
                                "candidate-1"
                        };
                    }
                }
            });

        const result =
            await adapter.handle({
                requestId:
                    "request-1"
            });

        assert.deepEqual(
            result,
            {
                statusCode: 200,
                body: {
                    status: "created",
                    candidateId:
                        "candidate-1"
                }
            }
        );
    }
);

test(
    "maps invalid candidate to 422",
    async () => {
        const adapter =
            new StandardMeaningCandidateHttpAdapter({
                ingestionService: {
                    async ingest() {
                        return {
                            status: "invalid"
                        };
                    }
                }
            });

        const result =
            await adapter.handle({
                requestId:
                    "request-1"
            });

        assert.equal(
            result.statusCode,
            422
        );

        assert.equal(
            result.body.errorCode,
            "standard_meaning_candidate_invalid"
        );
    }
);

test(
    "maps denied connector trust to 401",
    async () => {
        const adapter =
            new StandardMeaningCandidateHttpAdapter({
                ingestionService: {
                    async ingest() {
                        return {
                            status: "denied"
                        };
                    }
                }
            });

        const result =
            await adapter.handle({
                requestId:
                    "request-1"
            });

        assert.equal(
            result.statusCode,
            401
        );

        assert.equal(
            result.body.errorCode,
            "connector_trust_denied"
        );
    }
);

test(
    "returns existing Standard Meaning candidates",
    async () => {
        const adapter =
            new StandardMeaningCandidateHttpAdapter({
                ingestionService: {
                    async ingest() {
                        return {
                            status: "created"
                        };
                    },

                    async list() {
                        return {
                            status: "found",

                            candidates: [{
                                candidateId:
                                    "candidate-1",

                                templateFieldKey:
                                    "sheet:0:column:3",

                                proposedMeaning:
                                    "受給者証の所持状態",

                                status:
                                    "submitted"
                            }]
                        };
                    }
                }
            });

        const result =
            await adapter.handleQuery({
                requestId:
                    "request-1",

                templateId:
                    "template-1"
            });

        assert.equal(
            result.statusCode,
            200
        );

        assert.equal(
            result.body.candidates.length,
            1
        );
    }
);
