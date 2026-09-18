"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Service =
    require("./ConnectorSemanticRecordPreviewService");

function createService({
    trustResult = {
        status: "verified",
        verifiedContext: {
            facilityId: "facility-1",
            connectorId: "connector-1"
        }
    },
    records = []
} = {}) {
    const calls = [];

    return {
        calls,
        service: new Service({
            connectorTrustService: {
                async authenticate(input) {
                    calls.push({
                        type: "authenticate",
                        input
                    });

                    return trustResult;
                }
            },
            semanticRecordPreviewRepository: {
                async getBySourceRecordKeys(input) {
                    calls.push({
                        type: "lookup",
                        input
                    });

                    return records;
                }
            }
        })
    };
}

test(
    "verified connector can perform read-only preview lookup",
    async () => {
        const { service, calls } =
            createService({
                records: [
                    {
                        sourceRecordKey:
                            "record-1"
                    }
                ]
            });

        const result =
            await service.lookup({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "record-1",
                    "record-2"
                ]
            });

        assert.equal(
            result.status,
            "found"
        );
        assert.equal(
            result.records.length,
            1
        );

        const lookup =
            calls.find(
                call =>
                    call.type === "lookup"
            );

        assert.deepEqual(
            lookup.input,
            {
                facilityId:
                    "facility-1",
                connectorId:
                    "connector-1",
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "record-1",
                    "record-2"
                ]
            }
        );
    }
);

test(
    "denied connector cannot reach repository",
    async () => {
        const { service, calls } =
            createService({
                trustResult: {
                    status: "denied"
                }
            });

        const result =
            await service.lookup({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "record-1"
                ]
            });

        assert.equal(
            result.status,
            "denied"
        );
        assert.equal(
            calls.some(
                call =>
                    call.type === "lookup"
            ),
            false
        );
    }
);

test(
    "invalid or duplicate keys are rejected before repository",
    async () => {
        for (const sourceRecordKeys of [
            [],
            [""],
            ["record-1", "record-1"],
            Array.from(
                { length: 501 },
                (_, index) =>
                    `record-${index}`
            )
        ]) {
            const { service, calls } =
                createService();

            const result =
                await service.lookup({
                    connectorId:
                        "connector-input",
                    credential:
                        "credential-input",
                    sourceDocumentKey:
                        "doc-1",
                    sourceRecordKeys
                });

            assert.equal(
                result.status,
                "invalid"
            );

            assert.equal(
                calls.some(
                    call =>
                        call.type === "lookup"
                ),
                false
            );
        }
    }
);

test(
    "repository failure becomes safe unavailable result",
    async () => {
        const service =
            new Service({
                connectorTrustService: {
                    async authenticate() {
                        return {
                            status: "verified",
                            verifiedContext: {
                                facilityId:
                                    "facility-1",
                                connectorId:
                                    "connector-1"
                            }
                        };
                    }
                },
                semanticRecordPreviewRepository: {
                    async getBySourceRecordKeys() {
                        throw new Error(
                            "internal detail"
                        );
                    }
                }
            });

        const result =
            await service.lookup({
                connectorId:
                    "connector-input",
                credential:
                    "credential-input",
                sourceDocumentKey:
                    "doc-1",
                sourceRecordKeys: [
                    "record-1"
                ]
            });

        assert.deepEqual(
            result,
            {
                status: "error",
                errorCode:
                    "semantic_record_preview_unavailable"
            }
        );
    }
);
