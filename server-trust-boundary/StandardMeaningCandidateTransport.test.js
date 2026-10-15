"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const StandardMeaningCandidateTransport =
    require(
        "./StandardMeaningCandidateTransport"
    );

function createTransport({
    handle
} = {}) {
    return new StandardMeaningCandidateTransport({
        httpAdapter: {
            async handle(input) {
                if (handle) {
                    return handle(input);
                }

                return {
                    statusCode: 200,
                    body: {
                        status: "created",
                        candidateId:
                            "candidate-1"
                    }
                };
            }
        },

        credentialTransport: {
            extract(value) {
                return value ===
                    "RISEN-Connector secret"
                    ? "secret"
                    : null;
            }
        }
    });
}

test(
    "POST forwards authenticated Standard Meaning candidate",
    async () => {
        let received = null;

        const transport =
            createTransport({
                handle(input) {
                    received = input;

                    return {
                        statusCode: 200,
                        body: {
                            status:
                                "created",
                            candidateId:
                                "candidate-1"
                        }
                    };
                }
            });

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",

                headers: {
                    authorization:
                        "RISEN-Connector secret",

                    "x-risen-connector-id":
                        " connector-1 "
                },

                body: {
                    standardMeaningCandidate: {
                        templateId:
                            "template-1",

                        templateFieldKey:
                            "field-1",

                        proposedMeaning:
                            "受給者証の所持状態",

                        evidence: {
                            sourceLabel:
                                "所持"
                        },

                        submittedAt:
                            "2026-10-15T11:30:00.000Z"
                    }
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            received.connectorId,
            "connector-1"
        );

        assert.equal(
            received.credential,
            "secret"
        );

        assert.deepEqual(
            received.standardMeaningCandidate,
            {
                templateId:
                    "template-1",

                templateFieldKey:
                    "field-1",

                proposedMeaning:
                    "受給者証の所持状態",

                evidence: {
                    sourceLabel:
                        "所持"
                },

                submittedAt:
                    "2026-10-15T11:30:00.000Z"
            }
        );
    }
);

test(
    "rejects malformed candidate wrapper",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",

                headers: {
                    authorization:
                        "RISEN-Connector secret",

                    "x-risen-connector-id":
                        "connector-1"
                },

                body: {
                    wrongWrapper: {}
                }
            });

        assert.equal(
            result.httpStatus,
            400
        );

        assert.equal(
            result.body.errorCode,
            "malformed_json"
        );
    }
);

test(
    "rejects missing connector trust",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method: "POST",
                contentType:
                    "application/json",
                headers: {},
                body: {
                    standardMeaningCandidate: {}
                }
            });

        assert.equal(
            result.httpStatus,
            401
        );

        assert.equal(
            result.body.errorCode,
            "connector_trust_denied"
        );
    }
);

test(
    "rejects unsupported method",
    async () => {
        const transport =
            createTransport();

        const result =
            await transport.handle({
                method: "PUT",
                headers: {}
            });

        assert.equal(
            result.httpStatus,
            405
        );

        assert.equal(
            result.body.errorCode,
            "method_not_allowed"
        );
    }
);

test(
    "GET forwards authenticated candidate template lookup",
    async () => {
        let received = null;

        const transport =
            new StandardMeaningCandidateTransport({
                httpAdapter: {
                    async handle() {
                        return {
                            statusCode: 200,
                            body: {
                                status: "created"
                            }
                        };
                    },

                    async handleQuery(input) {
                        received = input;

                        return {
                            statusCode: 200,

                            body: {
                                status: "found",

                                candidates: [{
                                    candidateId:
                                        "candidate-1",

                                    templateFieldKey:
                                        "sheet:0:column:3",

                                    proposedMeaning:
                                        "受給者証の所持状態"
                                }]
                            }
                        };
                    }
                },

                credentialTransport: {
                    extract(value) {
                        return value ===
                            "RISEN-Connector secret"
                            ? "secret"
                            : null;
                    }
                }
            });

        const result =
            await transport.handle({
                method: "GET",

                headers: {
                    authorization:
                        "RISEN-Connector secret",

                    "x-risen-connector-id":
                        " connector-1 "
                },

                query: {
                    templateId:
                        " template-1 "
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            received.connectorId,
            "connector-1"
        );

        assert.equal(
            received.credential,
            "secret"
        );

        assert.equal(
            received.templateId,
            "template-1"
        );
    }
);

test(
    "GET rejects missing candidate template id",
    async () => {
        const transport =
            new StandardMeaningCandidateTransport({
                httpAdapter: {
                    async handle() {
                        return {};
                    },

                    async handleQuery() {
                        throw new Error(
                            "must not run"
                        );
                    }
                },

                credentialTransport: {
                    extract() {
                        return "secret";
                    }
                }
            });

        const result =
            await transport.handle({
                method: "GET",

                headers: {
                    authorization:
                        "RISEN-Connector secret",

                    "x-risen-connector-id":
                        "connector-1"
                },

                query: {}
            });

        assert.equal(
            result.httpStatus,
            422
        );

        assert.equal(
            result.body.errorCode,
            "standard_meaning_candidate_invalid"
        );
    }
);
