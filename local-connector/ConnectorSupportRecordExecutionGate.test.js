"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ConnectorSupportRecordExecutionGate =
    require("./ConnectorSupportRecordExecutionGate");

const FINGERPRINT = "a".repeat(64);
const OTHER = "b".repeat(64);

const PLAN = [
    {
        sourceRecordKey: "record-1",
        residentId: "resident-1",
        action: "new",
        recordId: null,
        baselineHash: null,
        targetHash: "c".repeat(64),
        targetSemanticContent: {
            semanticType: "support_record",
            fields: {
                record_date:
                    "2026-09-17 09:00",
                record_content:
                    "記録1",
                staff_name: null,
                record_category: null,
                created_at: null
            },
            customFields: {}
        },
        canonicalizationVersion:
            "risen-semantic-canonicalization-2"
    }
];

function createGate(previewResult) {
    const calls = [];

    const gate =
        new ConnectorSupportRecordExecutionGate({
            importPreviewService: {
                async buildExecutionPlan(input) {
                    calls.push(input);
                    return previewResult;
                }
            }
        });

    return {
        gate,
        calls
    };
}

function input(overrides = {}) {
    return {
        sourceDocumentKey: "doc-1",
        sourceUpdatedAt:
            "2026-09-17T00:00:00.000Z",
        sourceSize: 100,
        expectedFingerprint:
            FINGERPRINT,
        ...overrides
    };
}

test(
    "matching regenerated preview fingerprint is verified",
    async () => {
        const { gate, calls } =
            createGate({
                status: "ready",
                previewFingerprint:
                    FINGERPRINT,
                executionPlan: PLAN
            });

        assert.deepEqual(
            await gate.verify(input()),
            {
                status: "verified",
                previewFingerprint:
                    FINGERPRINT,
                executionPlan: PLAN
            }
        );

        assert.deepEqual(
            calls,
            [
                {
                    sourceDocumentKey:
                        "doc-1",
                    sourceUpdatedAt:
                        "2026-09-17T00:00:00.000Z",
                    sourceSize: 100
                }
            ]
        );
    }
);

test(
    "changed regenerated preview fingerprint is stale",
    async () => {
        const { gate } =
            createGate({
                status: "ready",
                previewFingerprint:
                    OTHER,
                executionPlan: PLAN
            });

        assert.deepEqual(
            await gate.verify(input()),
            {
                status: "stale"
            }
        );
    }
);

test(
    "ready fingerprint without execution plan is blocked",
    async () => {
        const { gate } =
            createGate({
                status: "ready",
                previewFingerprint:
                    FINGERPRINT
            });

        assert.deepEqual(
            await gate.verify(input()),
            {
                status: "blocked"
            }
        );
    }
);

test(
    "blocked regenerated preview cannot execute",
    async () => {
        const { gate } =
            createGate({
                status: "blocked",
                previewFingerprint: null
            });

        assert.deepEqual(
            await gate.verify(input()),
            {
                status: "blocked"
            }
        );
    }
);

test(
    "invalid expected fingerprint is rejected before preview",
    async () => {
        const { gate, calls } =
            createGate({
                status: "ready",
                previewFingerprint:
                    FINGERPRINT
            });

        assert.deepEqual(
            await gate.verify(
                input({
                    expectedFingerprint:
                        "invalid"
                })
            ),
            {
                status: "invalid"
            }
        );

        assert.equal(
            calls.length,
            0
        );
    }
);

test(
    "invalid regenerated fingerprint cannot execute",
    async () => {
        const { gate } =
            createGate({
                status: "ready",
                previewFingerprint:
                    "invalid"
            });

        assert.deepEqual(
            await gate.verify(input()),
            {
                status: "blocked"
            }
        );
    }
);
