"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Gate = require("./RecipientCertificateExecutionGate");

const fingerprint = "a".repeat(64);
const newerFingerprint = "b".repeat(64);

function request(overrides = {}) {
    return {
        sourceDocumentKey: "certificate.xlsx",
        sourceUpdatedAt: "2026-09-22T02:00:00.000Z",
        sourceSize: 123,
        expectedFingerprint: fingerprint,
        ...overrides
    };
}

test("matching rebuilt fingerprint verifies internal plan", async () => {
    const executionPlan = [{ id: "internal-plan" }];
    const calls = [];

    const gate = new Gate({
        importPreviewService: {
            async buildExecutionPlan(snapshot) {
                calls.push(snapshot);
                return {
                    status: "ready",
                    previewFingerprint: fingerprint,
                    executionPlan
                };
            }
        }
    });

    const result = await gate.verify(request());

    assert.deepStrictEqual(result, {
        status: "verified",
        previewFingerprint: fingerprint,
        executionPlan
    });
    assert.deepStrictEqual(calls, [{
        sourceDocumentKey: "certificate.xlsx",
        sourceUpdatedAt: "2026-09-22T02:00:00.000Z",
        sourceSize: 123
    }]);
});

test("fingerprint mismatch is stale and never returns plan", async () => {
    const gate = new Gate({
        importPreviewService: {
            async buildExecutionPlan() {
                return {
                    status: "ready",
                    previewFingerprint: newerFingerprint,
                    executionPlan: [{ id: "must-not-leak" }]
                };
            }
        }
    });

    const result = await gate.verify(request());

    assert.deepStrictEqual(result, {
        status: "stale",
        previewFingerprint: newerFingerprint
    });
    assert.strictEqual(
        Object.hasOwn(result, "executionPlan"),
        false
    );
});

test("blocked rebuilt preview remains blocked", async () => {
    const gate = new Gate({
        importPreviewService: {
            async buildExecutionPlan() {
                return { status: "blocked" };
            }
        }
    });

    assert.deepStrictEqual(
        await gate.verify(request()),
        { status: "blocked" }
    );
});

test("malformed rebuilt plan fails closed", async () => {
    const gate = new Gate({
        importPreviewService: {
            async buildExecutionPlan() {
                return {
                    status: "ready",
                    previewFingerprint: fingerprint,
                    executionPlan: []
                };
            }
        }
    });

    assert.deepStrictEqual(
        await gate.verify(request()),
        { status: "blocked" }
    );
});

test("invalid execution request is rejected before preview rebuild", async () => {
    let calls = 0;

    const gate = new Gate({
        importPreviewService: {
            async buildExecutionPlan() {
                calls += 1;
                throw new Error("must not run");
            }
        }
    });

    assert.deepStrictEqual(
        await gate.verify(
            request({ expectedFingerprint: "bad" })
        ),
        { status: "invalid" }
    );
    assert.strictEqual(calls, 0);
});
