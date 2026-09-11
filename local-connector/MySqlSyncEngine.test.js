"use strict";

const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const MySqlSyncEngine =
    require("./MySqlSyncEngine");

function createStateStore() {
    const state = {
        sourceId: "support",
        sourceDocumentKey:
            "opaque-source-key",
        lastSuccessRevision: null,
        lastSuccessAt: null,
        lastAttemptAt: null,
        failureCount: 0,
        nextRetryAt: null,
        lastErrorCode: null
    };

    return {
        state,

        getOrCreate() {
            return {
                ...state
            };
        },

        markAttempt() {
            state.lastAttemptAt =
                "2026-09-11T00:00:00.000Z";
        },

        markSuccess(
            sourceId,
            revision
        ) {
            state.lastSuccessRevision =
                revision;
            state.failureCount = 0;
            state.nextRetryAt = null;
        },

        markFailure(
            sourceId,
            {
                nextRetryAt,
                errorCode
            }
        ) {
            state.failureCount += 1;
            state.nextRetryAt =
                nextRetryAt;
            state.lastErrorCode =
                errorCode;
        }
    };
}

test(
    "new MySQL revision is ingested and persisted",
    async () => {
        const store =
            createStateStore();
        let ingested = 0;

        const engine =
            new MySqlSyncEngine({
                sourceAdapter: {
                    async observe() {
                        return {
                            revision:
                                "a".repeat(64)
                        };
                    }
                },
                ingestionService: {
                    async ingestSource() {
                        ingested += 1;
                        return {
                            status: "matched"
                        };
                    }
                },
                stateStore: store
            });

        const result =
            await engine.syncOnce(
                "support"
            );

        assert.deepStrictEqual(
            result,
            {
                attempted: 1,
                succeeded: 1,
                failed: 0,
                skipped: 0
            }
        );

        assert.strictEqual(
            ingested,
            1
        );

        assert.strictEqual(
            store.state
                .lastSuccessRevision,
            "a".repeat(64)
        );
    }
);

test(
    "unchanged successful revision is skipped",
    async () => {
        const store =
            createStateStore();

        store.state
            .lastSuccessRevision =
            "b".repeat(64);

        let ingested = 0;

        const engine =
            new MySqlSyncEngine({
                sourceAdapter: {
                    async observe() {
                        return {
                            revision:
                                "b".repeat(64)
                        };
                    }
                },
                ingestionService: {
                    async ingestSource() {
                        ingested += 1;
                    }
                },
                stateStore: store
            });

        const result =
            await engine.syncOnce(
                "support"
            );

        assert.strictEqual(
            result.skipped,
            1
        );

        assert.strictEqual(
            ingested,
            0
        );
    }
);

test(
    "failed ingestion is retried after bounded delay",
    async () => {
        const store =
            createStateStore();

        const now =
            new Date(
                "2026-09-11T00:00:00.000Z"
            );

        const engine =
            new MySqlSyncEngine({
                sourceAdapter: {
                    async observe() {
                        return {
                            revision:
                                "c".repeat(64)
                        };
                    }
                },
                ingestionService: {
                    async ingestSource() {
                        throw new Error(
                            "private failure"
                        );
                    }
                },
                stateStore: store,
                clock: () => now,
                retryDelayMs: 5000
            });

        const result =
            await engine.syncOnce(
                "support"
            );

        assert.strictEqual(
            result.failed,
            1
        );

        assert.strictEqual(
            store.state.failureCount,
            1
        );

        assert.strictEqual(
            store.state.lastErrorCode,
            "ingestion_failed"
        );

        assert.strictEqual(
            store.state.nextRetryAt,
            "2026-09-11T00:00:05.000Z"
        );
    }
);

test(
    "persistent opaque sourceDocumentKey reaches MySQL ingestion boundary",
    async () => {
        const store =
            createStateStore();

        store.state.sourceDocumentKey =
            "persistent-opaque-source-key";

        const observedRevision =
            "d".repeat(64);

        let received = null;

        const sourceAdapter = {
            async observe(
                sourceId,
                {
                    sourceDocumentKey
                } = {}
            ) {
                assert.strictEqual(
                    sourceId,
                    "support"
                );

                assert.strictEqual(
                    sourceDocumentKey,
                    "persistent-opaque-source-key"
                );

                return {
                    sourceId,
                    sourceDocumentKey,
                    revision:
                        observedRevision
                };
            }
        };

        const ingestionService = {
            async ingestSource(
                sourceId,
                trustedObservation
            ) {
                received = {
                    sourceId,
                    sourceDocumentKey:
                        trustedObservation
                            .sourceDocumentKey,
                    revision:
                        trustedObservation
                            .revision
                };

                return {
                    status: "matched"
                };
            }
        };

        const engine =
            new MySqlSyncEngine({
                sourceAdapter,
                ingestionService,
                stateStore: store
            });

        const result =
            await engine.syncOnce(
                "support"
            );

        assert.deepStrictEqual(
            result,
            {
                attempted: 1,
                succeeded: 1,
                failed: 0,
                skipped: 0
            }
        );

        assert.deepStrictEqual(
            received,
            {
                sourceId: "support",
                sourceDocumentKey:
                    "persistent-opaque-source-key",
                revision:
                    observedRevision
            }
        );

        assert.strictEqual(
            store.state
                .lastSuccessRevision,
            observedRevision
        );
    }
);
