"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const LocalImportExecutionService =
    require("./LocalImportExecutionService");

const FINGERPRINT = "a".repeat(64);

function input() {
    return {
        sourceDocumentKey: "doc-1",
        sourceUpdatedAt:
            "2026-09-17T00:00:00.000Z",
        sourceSize: 100,
        expectedFingerprint: FINGERPRINT
    };
}

test("verified plan is the only plan sent to execution", async () => {
    const plan = [
        {
            sourceRecordKey: "record-1"
        }
    ];

    let received = null;

    const service =
        new LocalImportExecutionService({
            executionGate: {
                async verify(receivedInput) {
                    assert.deepEqual(
                        receivedInput,
                        input()
                    );
                    return {
                        status: "verified",
                        previewFingerprint:
                            FINGERPRINT,
                        executionPlan: plan
                    };
                }
            },
            executionService: {
                async execute(value) {
                    received = value;
                    return {
                        status: "completed",
                        processed: 1,
                        created: 1,
                        updated: 0,
                        alreadyApplied: 0
                    };
                }
            }
        });

    const result =
        await service.execute(input());

    assert.deepEqual(received, {
        sourceDocumentKey: "doc-1",
        executionPlan: plan
    });
    assert.equal(result.status, "completed");
});

for (const status of ["invalid", "blocked", "stale"]) {
    test(`${status} gate result never reaches execution`, async () => {
        let called = false;

        const service =
            new LocalImportExecutionService({
                executionGate: {
                    async verify() {
                        return { status };
                    }
                },
                executionService: {
                    async execute() {
                        called = true;
                        return { status: "completed" };
                    }
                }
            });

        assert.deepEqual(
            await service.execute(input()),
            { status }
        );
        assert.equal(called, false);
    });
}
