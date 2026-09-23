"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("./SourceRecordIdentityCandidateService");

test("uses only the resolved source snapshot to find candidates", async () => {
    let receivedSnapshotInput = null;
    let receivedResolverInput = null;

    const service = new Service({
        localConnectorService: {
            async resolveSourceSnapshot(input) {
                receivedSnapshotInput = input;
                return {
                    analysis: {
                        extracted: {
                            fieldDefinitions: [
                                { sourceFieldKey: "f1", headerLabel: "社員番号" }
                            ],
                            sourceEntities: [
                                { valuesBySourceFieldKey: { f1: "001" } },
                                { valuesBySourceFieldKey: { f1: "002" } }
                            ]
                        }
                    }
                };
            }
        },
        resolver: {
            resolve(input) {
                receivedResolverInput = input;
                return {
                    status: "candidates_available",
                    candidates: [{
                        sourceFieldKey: "f1",
                        headerLabel: "社員番号",
                        humanConfirmationRequired: true
                    }]
                };
            }
        }
    });

    const snapshotInput = {
        sourceDocumentKey: "document-key",
        sourceUpdatedAt: "2026-09-20T00:00:00.000Z",
        sourceSize: 123
    };

    const result = await service.findCandidates(snapshotInput);

    assert.deepStrictEqual(receivedSnapshotInput, snapshotInput);
    assert.deepStrictEqual(receivedResolverInput, {
        fieldDefinitions: [
            { sourceFieldKey: "f1", headerLabel: "社員番号" }
        ],
        sourceEntities: [
            { valuesBySourceFieldKey: { f1: "001" } },
            { valuesBySourceFieldKey: { f1: "002" } }
        ]
    });
    assert.equal(result.status, "candidates_available");
});

test("fails closed when snapshot structures are unavailable", async () => {
    let resolverCalled = false;

    const service = new Service({
        localConnectorService: {
            async resolveSourceSnapshot() {
                return { analysis: { extracted: {} } };
            }
        },
        resolver: {
            resolve() {
                resolverCalled = true;
                return {};
            }
        }
    });

    const result = await service.findCandidates({
        sourceDocumentKey: "document-key",
        sourceUpdatedAt: "2026-09-20T00:00:00.000Z",
        sourceSize: 123
    });

    assert.deepStrictEqual(result, {
        status: "insufficient_source",
        candidates: []
    });
    assert.equal(resolverCalled, false);
});
