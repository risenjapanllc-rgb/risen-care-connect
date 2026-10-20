"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const MultiProjectionExecutionCoordinator =
    require("./MultiProjectionExecutionCoordinator");

test(
    "複数Projectionを順番に実行し途中失敗では確定済みProjectionを保持する",
    async () => {
        const calls = [];

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute(input) {
                            calls.push({
                                semanticType:
                                    "recipient_certificate",
                                input
                            });

                            return {
                                status: "completed",
                                processed: 49
                            };
                        }
                    },

                    service_contract: {
                        async execute(input) {
                            calls.push({
                                semanticType:
                                    "service_contract",
                                input
                            });

                            return {
                                status: "completed",
                                processed: 49
                            };
                        }
                    },

                    service_entitlement: {
                        async execute(input) {
                            calls.push({
                                semanticType:
                                    "service_entitlement",
                                input
                            });

                            return {
                                status: "conflict",
                                processed: 12
                            };
                        }
                    },

                    cost_sharing: {
                        async execute(input) {
                            calls.push({
                                semanticType:
                                    "cost_sharing",
                                input
                            });

                            return {
                                status: "completed"
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 12345,

                projections: [
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "a".repeat(64)
                    },
                    {
                        semanticType:
                            "service_contract",
                        expectedFingerprint:
                            "b".repeat(64)
                    },
                    {
                        semanticType:
                            "service_entitlement",
                        expectedFingerprint:
                            "c".repeat(64)
                    },
                    {
                        semanticType:
                            "cost_sharing",
                        expectedFingerprint:
                            "d".repeat(64)
                    }
                ]
            });

        assert.deepStrictEqual(
            calls.map(call => call.semanticType),
            [
                "recipient_certificate",
                "service_contract",
                "service_entitlement"
            ]
        );

        assert.strictEqual(
            result.status,
            "partially_completed"
        );

        assert.deepStrictEqual(
            result.projections.map(item => ({
                semanticType: item.semanticType,
                status: item.status
            })),
            [
                {
                    semanticType:
                        "recipient_certificate",
                    status: "completed"
                },
                {
                    semanticType:
                        "service_contract",
                    status: "completed"
                },
                {
                    semanticType:
                        "service_entitlement",
                    status: "conflict"
                },
                {
                    semanticType:
                        "cost_sharing",
                    status: "not_started"
                }
            ]
        );
    }
);

test(
    "すべてのProjection成功ならcompletedを返す",
    async () => {
        const calls = [];

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute() {
                            calls.push("recipient_certificate");
                            return {
                                status: "completed",
                                processed: 2
                            };
                        }
                    },
                    service_contract: {
                        async execute() {
                            calls.push("service_contract");
                            return {
                                status: "completed",
                                processed: 2
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 123,
                projections: [
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "a".repeat(64)
                    },
                    {
                        semanticType:
                            "service_contract",
                        expectedFingerprint:
                            "b".repeat(64)
                    }
                ]
            });

        assert.strictEqual(
            result.status,
            "completed"
        );

        assert.deepStrictEqual(
            calls,
            [
                "recipient_certificate",
                "service_contract"
            ]
        );
    }
);

test(
    "最初のProjectionでconflictなら後続を実行しない",
    async () => {
        const calls = [];

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute() {
                            calls.push("recipient_certificate");
                            return {
                                status: "conflict"
                            };
                        }
                    },
                    service_contract: {
                        async execute() {
                            calls.push("service_contract");
                            return {
                                status: "completed"
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 123,
                projections: [
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "a".repeat(64)
                    },
                    {
                        semanticType:
                            "service_contract",
                        expectedFingerprint:
                            "b".repeat(64)
                    }
                ]
            });

        assert.strictEqual(
            result.status,
            "conflict"
        );

        assert.deepStrictEqual(
            calls,
            ["recipient_certificate"]
        );

        assert.strictEqual(
            result.projections[1].status,
            "not_started"
        );
    }
);

test(
    "executor例外ではerrorになり後続を実行しない",
    async () => {
        let secondCalled = false;

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute() {
                            throw new Error("boom");
                        }
                    },
                    service_contract: {
                        async execute() {
                            secondCalled = true;
                            return {
                                status: "completed"
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 123,
                projections: [
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "a".repeat(64)
                    },
                    {
                        semanticType:
                            "service_contract",
                        expectedFingerprint:
                            "b".repeat(64)
                    }
                ]
            });

        assert.strictEqual(
            result.status,
            "error"
        );

        assert.strictEqual(
            secondCalled,
            false
        );
    }
);

test(
    "未対応Projectionは実行せずunsupportedを返す",
    async () => {
        let called = false;

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute() {
                            called = true;
                            return {
                                status: "completed"
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 123,
                projections: [
                    {
                        semanticType:
                            "future_projection",
                        expectedFingerprint:
                            "a".repeat(64)
                    }
                ]
            });

        assert.strictEqual(
            result.status,
            "unsupported"
        );

        assert.strictEqual(
            called,
            false
        );
    }
);

test(
    "後続Projectionのfingerprintが不正なら一件も実行しない",
    async () => {
        const calls = [];

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute() {
                            calls.push("recipient_certificate");
                            return {
                                status: "completed"
                            };
                        }
                    },
                    service_contract: {
                        async execute() {
                            calls.push("service_contract");
                            return {
                                status: "completed"
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 123,
                projections: [
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "a".repeat(64)
                    },
                    {
                        semanticType:
                            "service_contract",
                        expectedFingerprint:
                            "broken"
                    }
                ]
            });

        assert.strictEqual(
            result.status,
            "invalid"
        );

        assert.deepStrictEqual(
            calls,
            []
        );
    }
);

test(
    "同じsemanticTypeの重複Projectionは実行前に拒否する",
    async () => {
        let calls = 0;

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute() {
                            calls += 1;
                            return {
                                status: "completed"
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 123,
                projections: [
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "a".repeat(64)
                    },
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "b".repeat(64)
                    }
                ]
            });

        assert.strictEqual(
            result.status,
            "invalid"
        );

        assert.strictEqual(
            calls,
            0
        );
    }
);

test(
    "後続に未対応Projectionがあれば一件も実行しない",
    async () => {
        const calls = [];

        const coordinator =
            new MultiProjectionExecutionCoordinator({
                executors: {
                    recipient_certificate: {
                        async execute() {
                            calls.push(
                                "recipient_certificate"
                            );

                            return {
                                status: "completed"
                            };
                        }
                    }
                }
            });

        const result =
            await coordinator.execute({
                sourceDocumentKey: "source-1",
                sourceUpdatedAt:
                    "2026-10-15T00:00:00.000Z",
                sourceSize: 123,
                projections: [
                    {
                        semanticType:
                            "recipient_certificate",
                        expectedFingerprint:
                            "a".repeat(64)
                    },
                    {
                        semanticType:
                            "service_contract",
                        expectedFingerprint:
                            "b".repeat(64)
                    }
                ]
            });

        assert.strictEqual(
            result.status,
            "unsupported"
        );

        assert.deepStrictEqual(
            calls,
            []
        );

        assert.deepStrictEqual(
            result.projections.map(
                item => item.status
            ),
            [
                "not_started",
                "unsupported"
            ]
        );
    }
);
