"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const StandardMeaningCandidateIngestionService =
    require(
        "./StandardMeaningCandidateIngestionService"
    );

function createService({
    trustResult = {
        status: "verified",
        verifiedContext: {
            facilityId:
                "facility-1",
            connectorId:
                "connector-1"
        }
    },
    validationResult = {
        status: "valid",
        validated: {
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
    },
    repositoryResult = {
        status: "created",
        candidateId:
            "candidate-1"
    }
} = {}) {
    let submitted = null;

    const service =
        new StandardMeaningCandidateIngestionService({
            connectorTrustService: {
                async authenticate() {
                    return trustResult;
                }
            },

            payloadValidator: {
                validate() {
                    return validationResult;
                }
            },

            persistenceRepository: {
                async submit(input) {
                    submitted = input;
                    return repositoryResult;
                }
            }
        });

    return {
        service,
        getSubmitted() {
            return submitted;
        }
    };
}

test(
    "submits validated candidate with verified facility and connector identity",
    async () => {
        const {
            service,
            getSubmitted
        } =
            createService();

        const result =
            await service.ingest({
                connectorId:
                    "untrusted-connector-input",
                credential:
                    "credential",
                standardMeaningCandidate: {
                    anything:
                        "validator owns payload parsing"
                }
            });

        assert.equal(
            result.status,
            "created"
        );

        assert.equal(
            result.candidateId,
            "candidate-1"
        );

        assert.deepEqual(
            getSubmitted(),
            {
                verifiedFacilityId:
                    "facility-1",

                verifiedConnectorId:
                    "connector-1",

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
    "does not persist when connector trust is denied",
    async () => {
        const {
            service,
            getSubmitted
        } =
            createService({
                trustResult: {
                    status:
                        "denied"
                }
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector-1",
                credential:
                    "bad",
                standardMeaningCandidate: {}
            });

        assert.equal(
            result.status,
            "denied"
        );

        assert.equal(
            getSubmitted(),
            null
        );
    }
);

test(
    "does not persist invalid candidate payload",
    async () => {
        const {
            service,
            getSubmitted
        } =
            createService({
                validationResult: {
                    status:
                        "invalid"
                }
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector-1",
                credential:
                    "credential",
                standardMeaningCandidate: {}
            });

        assert.equal(
            result.status,
            "invalid"
        );

        assert.equal(
            getSubmitted(),
            null
        );
    }
);

test(
    "preserves conflict result",
    async () => {
        const {
            service
        } =
            createService({
                repositoryResult: {
                    status:
                        "conflict",
                    candidateId:
                        "candidate-1"
                }
            });

        const result =
            await service.ingest({
                connectorId:
                    "connector-1",
                credential:
                    "credential",
                standardMeaningCandidate: {}
            });

        assert.deepEqual(
            result,
            {
                status:
                    "conflict",
                candidateId:
                    "candidate-1"
            }
        );
    }
);

test(
    "lists candidates with verified facility and connector identity",
    async () => {
        let received = null;

        const service =
            new StandardMeaningCandidateIngestionService({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status:
                                "verified",

                            verifiedContext: {
                                facilityId:
                                    "facility-1",

                                connectorId:
                                    "connector-1"
                            }
                        };
                    }
                },

                payloadValidator: {
                    validate() {
                        return {
                            status:
                                "valid"
                        };
                    }
                },

                persistenceRepository: {
                    async submit() {
                        return {
                            status:
                                "created"
                        };
                    },

                    async list(input) {
                        received = input;

                        return {
                            status:
                                "found",

                            candidates: [{
                                candidateId:
                                    "candidate-1",

                                templateFieldKey:
                                    "field-1",

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
            await service.list({
                connectorId:
                    "untrusted-input",

                credential:
                    "credential",

                templateId:
                    " template-1 "
            });

        assert.equal(
            result.status,
            "found"
        );

        assert.equal(
            result.candidates.length,
            1
        );

        assert.deepEqual(
            received,
            {
                verifiedFacilityId:
                    "facility-1",

                verifiedConnectorId:
                    "connector-1",

                templateId:
                    "template-1"
            }
        );
    }
);
