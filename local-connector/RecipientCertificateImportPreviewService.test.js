"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Service = require("./RecipientCertificateImportPreviewService");
const Strategy = require("./RecipientCertificateImportPreviewStrategy");
const Fingerprint = require("./RecipientCertificatePreviewFingerprint");

const digest = "a".repeat(64);

function createHarness() {
    const calls = {
        candidate: [],
        mapping: [],
        decision: []
    };

    const requestedSnapshot = {
        sourceDocumentKey: "requested.xlsx",
        sourceUpdatedAt: "2026-09-22T01:00:00.000Z",
        sourceSize: 100
    };

    const resolvedSnapshot = {
        sourceDocumentKey: "resolved.xlsx",
        sourceUpdatedAt: "2026-09-22T02:00:00.000Z",
        sourceSize: 200,
        analysis: {
            extracted: {
                sourceEntities: []
            }
        }
    };

    const service = new Service({
        candidateResolver: {
            async findCandidateGroups(snapshot) {
                calls.candidate.push(snapshot);
                return {
                    groups: [
                        {
                            identifierType: "name",
                            identifierDigest: digest,
                            identifierValue: "Test Resident",
                            sourceEntityKeys: []
                        }
                    ],
                    sourceEntityCount: 1,
                    unavailableSourceEntityCount: 0
                };
            }
        },
        sourceResidentMappingClient: {
            async list(snapshot) {
                calls.mapping.push(snapshot);
                return {
                    status: "found",
                    mappings: []
                };
            }
        },
        admissionDecisionService: {
            async list(snapshot) {
                calls.decision.push(snapshot);
                return {
                    status: "found",
                    decisions: [
                        {
                            sourceEntityKey:
                                "resident:name:" + digest,
                            decision: "approved_new"
                        }
                    ]
                };
            }
        },
        localConnectorService: {
            async resolveSourceSnapshot(snapshot) {
                assert.deepStrictEqual(
                    snapshot,
                    requestedSnapshot
                );
                return resolvedSnapshot;
            }
        },
        previewFingerprint: new Fingerprint(),
        strategy: {
            build({ subjects }) {
                assert.strictEqual(subjects.length, 1);
                return {
                    status: "preview_only",
                    executionAvailable: false,
                    summary: {},
                    items: [
                        {
                            resolution: "planned_new",
                            identifierType: "name",
                            identifierDigest: digest,
                            residentId: null,
                            displayName: "Test Resident",
                            persistenceAction: "create",
                            persistenceContract: {
                                semanticType:
                                    "recipient_certificate",
                                logicalSlot: "primary",
                                semanticContent: {
                                    certificateNumber: "ABC123"
                                },
                                contentHash: "b".repeat(64),
                                canonicalizationVersion:
                                    "risen-recipient-certificate-canonicalization-1",
                                expectedContentHash: null
                            },
                            semanticRecords: []
                        }
                    ]
                };
            }
        }
    });

    return {
        service,
        calls,
        requestedSnapshot,
        resolvedSnapshot
    };
}

test("public preview exposes fingerprint but never execution plan", async () => {
    const { service, requestedSnapshot } = createHarness();
    const result = await service.preview(requestedSnapshot);

    assert.strictEqual(result.status, "preview_only");
    assert.match(result.previewFingerprint, /^[0-9a-f]{64}$/);
    assert.strictEqual(
        Object.hasOwn(result, "executionPlan"),
        false
    );
    assert.strictEqual(result.executionAvailable, true);
});

test("internal buildExecutionPlan returns fingerprint-bound plan", async () => {
    const { service, requestedSnapshot } = createHarness();
    const result =
        await service.buildExecutionPlan(requestedSnapshot);

    assert.strictEqual(result.status, "ready");
    assert.match(result.previewFingerprint, /^[0-9a-f]{64}$/);
    assert.strictEqual(result.executionPlan.length, 1);
    assert.strictEqual(
        result.executionPlan[0].identifierDigest,
        digest
    );
    assert.strictEqual(
        result.executionPlan[0].resolution,
        "planned_new"
    );
});

test("all snapshot-sensitive dependencies use resolved snapshot", async () => {
    const {
        service,
        calls,
        requestedSnapshot,
        resolvedSnapshot
    } = createHarness();

    await service.preview(requestedSnapshot);

    assert.deepStrictEqual(calls.candidate, [resolvedSnapshot]);
    assert.deepStrictEqual(calls.mapping, [resolvedSnapshot]);
    assert.deepStrictEqual(calls.decision, [resolvedSnapshot]);
});

test("same resolved state reproduces the same fingerprint", async () => {
    const { service, requestedSnapshot } = createHarness();

    const publicPreview =
        await service.preview(requestedSnapshot);
    const internalPlan =
        await service.buildExecutionPlan(requestedSnapshot);

    assert.strictEqual(
        publicPreview.previewFingerprint,
        internalPlan.previewFingerprint
    );
});

test("blocked preview never exposes an executable plan", async () => {
    const { service, requestedSnapshot } = createHarness();

    service.strategy = new Strategy({
        canonicalizer: {
            canonicalize() {
                throw new Error("must not canonicalize");
            }
        }
    });

    service.admissionDecisionService = {
        async list() {
            return {
                status: "found",
                decisions: []
            };
        }
    };

    const publicPreview =
        await service.preview(requestedSnapshot);
    const internalPlan =
        await service.buildExecutionPlan(requestedSnapshot);

    assert.strictEqual(publicPreview.status, "blocked");
    assert.strictEqual(publicPreview.previewFingerprint, null);
    assert.strictEqual(
        publicPreview.executionAvailable,
        false
    );
    assert.strictEqual(
        Object.hasOwn(publicPreview, "executionPlan"),
        false
    );
    assert.deepStrictEqual(internalPlan, { status: "blocked" });
});

test("included item without persistence contract fails closed", async () => {
    const { service, requestedSnapshot } = createHarness();

    service.strategy = {
        build() {
            return {
                status: "preview_only",
                executionAvailable: false,
                summary: {},
                items: [
                    {
                        resolution: "existing",
                        identifierType: "name",
                        identifierDigest: digest,
                        residentId: "resident-1",
                        displayName: "Test Resident",
                        persistenceAction: "create",
                        persistenceContract: null
                    }
                ]
            };
        }
    };

    const preview =
        await service.preview(requestedSnapshot);
    const internal =
        await service.buildExecutionPlan(requestedSnapshot);

    assert.strictEqual(preview.previewFingerprint, null);
    assert.strictEqual(
        preview.executionAvailable,
        false
    );
    assert.deepStrictEqual(internal, {
        status: "blocked"
    });
});

test("planned new user_code without trusted name fails closed", async () => {
    const { service, requestedSnapshot } = createHarness();

    service.strategy = {
        build() {
            return {
                status: "preview_only",
                executionAvailable: false,
                summary: {},
                items: [
                    {
                        resolution: "planned_new",
                        identifierType: "user_code",
                        identifierDigest: digest,
                        residentId: null,
                        displayName: null,
                        persistenceAction: "create",
                        persistenceContract: {
                            semanticType:
                                "recipient_certificate",
                            logicalSlot: "primary",
                            semanticContent: {
                                certificateNumber: "ABC123"
                            },
                            contentHash: "b".repeat(64),
                            canonicalizationVersion:
                                "risen-recipient-certificate-canonicalization-1",
                            expectedContentHash: null
                        }
                    }
                ]
            };
        }
    };

    const preview =
        await service.preview(requestedSnapshot);
    const internal =
        await service.buildExecutionPlan(requestedSnapshot);

    assert.strictEqual(preview.previewFingerprint, null);
    assert.strictEqual(
        preview.executionAvailable,
        false
    );
    assert.deepStrictEqual(internal, {
        status: "blocked"
    });
});
