"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ServerTrustBoundaryIngestionService =
    require("./ServerTrustBoundaryIngestionService");

function createService({
    connectorResult,
    semanticResult,
    connectorImplementation,
    semanticImplementation
} = {}) {
    const connectorIngestionService = {
        ingestForSemanticProcessing:
            connectorImplementation ||
            (async () => connectorResult)
    };

    const semanticIngestionService = {
        ingest:
            semanticImplementation ||
            (async () => semanticResult)
    };

    return new ServerTrustBoundaryIngestionService({
        connectorIngestionService,
        semanticIngestionService
    });
}

test(
    "requires detailed connector ingestion service",
    () => {
        assert.throws(
            () =>
                new ServerTrustBoundaryIngestionService({
                    connectorIngestionService: {},
                    semanticIngestionService: {
                        ingest() {}
                    }
                })
        );
    }
);

test(
    "requires semantic ingestion service",
    () => {
        assert.throws(
            () =>
                new ServerTrustBoundaryIngestionService({
                    connectorIngestionService: {
                        ingestForSemanticProcessing() {}
                    }
                })
        );
    }
);

test(
    "requires exactly one semantic record",
    async () => {
        const service =
            createService();

        assert.deepStrictEqual(
            await service.ingest({
                semanticRecords: []
            }),
            {
                status: "invalid",
                errorCode:
                    "connector_payload_invalid"
            }
        );
    }
);

test(
    "stops before semantic processing when connector processing is denied",
    async () => {
        let semanticCalled = false;

        const service =
            createService({
                connectorResult: {
                    status: "denied",
                    errorCode:
                        "connector_trust_denied"
                },
                semanticImplementation:
                    async () => {
                        semanticCalled = true;
                    }
            });

        const result =
            await service.ingest({
                connectorId: "connector",
                credential: "credential",
                payload: {},
                semanticRecords: [{}]
            });

        assert.equal(result.status, "denied");
        assert.equal(semanticCalled, false);
    }
);

test(
    "passes only server-derived context into semantic ingestion",
    async () => {
        const verifiedContext = {
            connectorId: "trusted-connector",
            facilityId: "trusted-facility"
        };

        const residentMatching = {
            status: "matched",
            residentId: "trusted-resident",
            matchMethod:
                "facility_user_code"
        };

        const semanticRecord = {
            semanticContent: {
                semanticType:
                    "support_record"
            }
        };

        let received;

        const service =
            createService({
                connectorResult: {
                    status: "ready",
                    verifiedContext,
                    validatedPayload: {
                        ignored:
                            "not forwarded"
                    },
                    residentMatching
                },
                semanticImplementation:
                    async (input) => {
                        received = input;

                        return {
                            status:
                                "confirmed_candidate"
                        };
                    }
            });

        const result =
            await service.ingest({
                connectorId:
                    "untrusted-connector",
                credential:
                    "secret",
                payload: {
                    verifiedContext: {
                        facilityId:
                            "attacker-facility"
                    }
                },
                semanticRecords: [
                    semanticRecord
                ]
            });

        assert.deepStrictEqual(
            received,
            {
                verifiedContext,
                residentMatching,
                semanticRecord
            }
        );

        assert.deepStrictEqual(
            result,
            residentMatching
        );
    }
);

test(
    "pending review completes without persistence result leakage",
    async () => {
        const residentMatching = {
            status: "unmatched",
            residentId: null,
            matchMethod: null
        };

        const service =
            createService({
                connectorResult: {
                    status: "ready",
                    verifiedContext: {
                        connectorId: "connector",
                        facilityId: "facility"
                    },
                    residentMatching
                },
                semanticResult: {
                    status:
                        "pending_review",
                    recordId:
                        "must-not-leak"
                }
            });

        assert.deepStrictEqual(
            await service.ingest({
                semanticRecords: [{}]
            }),
            residentMatching
        );
    }
);

test(
    "semantic rejection fails closed",
    async () => {
        const service =
            createService({
                connectorResult: {
                    status: "ready",
                    verifiedContext: {
                        connectorId: "connector",
                        facilityId: "facility"
                    },
                    residentMatching: {
                        status: "matched",
                        residentId: "resident"
                    }
                },
                semanticResult: {
                    status: "rejected",
                    detail:
                        "must-not-leak"
                }
            });

        assert.deepStrictEqual(
            await service.ingest({
                semanticRecords: [{}]
            }),
            {
                status: "error",
                errorCode:
                    "semantic_ingestion_rejected"
            }
        );
    }
);

test(
    "semantic exception is sanitized",
    async () => {
        const service =
            createService({
                connectorResult: {
                    status: "ready",
                    verifiedContext: {
                        connectorId: "connector",
                        facilityId: "facility"
                    },
                    residentMatching: {
                        status: "matched",
                        residentId: "resident"
                    }
                },
                semanticImplementation:
                    async () => {
                        throw new Error(
                            "database secret detail"
                        );
                    }
            });

        assert.deepStrictEqual(
            await service.ingest({
                semanticRecords: [{}]
            }),
            {
                status: "error",
                errorCode:
                    "semantic_ingestion_exception"
            }
        );
    }
);
