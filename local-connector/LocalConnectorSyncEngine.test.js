"use strict";

const assert = require("node:assert");
const test = require("node:test");

const LocalConnectorSyncEngine =
    require("./LocalConnectorSyncEngine");

function createHarness({
    state = null,
    ingestError = null,
    updatedAt =
        "2026-09-11T00:00:00.000Z",
    size = 123,
    now =
        "2026-09-11T01:00:00.000Z"
} = {}) {
    const calls = {
        ingest: 0,
        attempt: 0,
        succeeded: 0,
        failed: 0
    };

    let storedState = state;

    const localConnectorService = {
        async getRegisteredFolderStatus() {
            return {
                status: "ready",
                files: [
                    {
                        relativePath:
                            "records/a.xlsx",
                        extension:
                            ".xlsx",
                        updatedAt,
                        size,
                        changeType:
                            "unchanged"
                    }
                ]
            };
        },

        async observeRegisteredFile() {
            return {
                sourceDocumentKey:
                    "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx"
            };
        }
    };

    const ingestionService = {
        async ingestRegisteredFile() {
            calls.ingest += 1;

            if (ingestError) {
                throw ingestError;
            }

            return {
                success: true,
                status: "matched"
            };
        }
    };

    const syncStateStore = {
        get() {
            return storedState;
        },

        markAttempt(input) {
            calls.attempt += 1;
            storedState = {
                ...(storedState || {}),
                sourceDocumentKey:
                    input.sourceDocumentKey,
                relativePathLookupKey:
                    input.relativePathLookupKey,
                status:
                    "in_progress",
                lastAttemptAt:
                    input.attemptedAt,
                failureCount:
                    storedState?.failureCount || 0
            };
            return storedState;
        },

        markSucceeded(input) {
            calls.succeeded += 1;
            storedState = {
                ...storedState,
                status: "succeeded",
                lastSuccessfulUpdatedAt:
                    input.updatedAt,
                lastSuccessfulSize:
                    input.size,
                failureCount: 0,
                nextRetryAt: null
            };
            return storedState;
        },

        markFailed(input) {
            calls.failed += 1;
            storedState = {
                ...storedState,
                status: "failed",
                failureCount:
                    (storedState?.failureCount || 0) +
                    1,
                nextRetryAt:
                    input.nextRetryAt,
                lastErrorCode:
                    input.errorCode
            };
            return storedState;
        }
    };

    const engine =
        new LocalConnectorSyncEngine({
            localConnectorService,
            ingestionService,
            syncStateStore,
            clock:
                () => new Date(now),
            baseRetryMs: 5000,
            maxRetryMs: 60000
        });

    return {
        engine,
        calls,
        getState:
            () => storedState
    };
}

test(
    "new document is synchronized and marked successful",
    async () => {
        const harness =
            createHarness();

        const result =
            await harness.engine.syncOnce();

        assert.deepStrictEqual(
            result,
            {
                status: "completed",
                scanned: 1,
                attempted: 1,
                succeeded: 1,
                failed: 0,
                skipped: 0
            }
        );

        assert.strictEqual(
            harness.calls.ingest,
            1
        );
        assert.strictEqual(
            harness.getState().status,
            "succeeded"
        );
    }
);

test(
    "unchanged successful document is skipped independently of registry changeType",
    async () => {
        const harness =
            createHarness({
                state: {
                    status: "succeeded",
                    lastSuccessfulUpdatedAt:
                        "2026-09-11T00:00:00.000Z",
                    lastSuccessfulSize: 123,
                    failureCount: 0
                }
            });

        const result =
            await harness.engine.syncOnce();

        assert.strictEqual(
            result.skipped,
            1
        );
        assert.strictEqual(
            result.attempted,
            0
        );
        assert.strictEqual(
            harness.calls.ingest,
            0
        );
    }
);

test(
    "changed metadata is synchronized even when registry observation says unchanged",
    async () => {
        const harness =
            createHarness({
                state: {
                    status: "succeeded",
                    lastSuccessfulUpdatedAt:
                        "2026-09-10T00:00:00.000Z",
                    lastSuccessfulSize: 100,
                    failureCount: 0
                }
            });

        const result =
            await harness.engine.syncOnce();

        assert.strictEqual(
            result.attempted,
            1
        );
        assert.strictEqual(
            result.succeeded,
            1
        );
        assert.strictEqual(
            harness.calls.ingest,
            1
        );
    }
);

test(
    "failed document waits until retry time",
    async () => {
        const harness =
            createHarness({
                state: {
                    status: "failed",
                    lastSuccessfulUpdatedAt:
                        null,
                    lastSuccessfulSize:
                        null,
                    failureCount: 1,
                    nextRetryAt:
                        "2026-09-11T01:01:00.000Z"
                },
                now:
                    "2026-09-11T01:00:00.000Z"
            });

        const result =
            await harness.engine.syncOnce();

        assert.strictEqual(
            result.skipped,
            1
        );
        assert.strictEqual(
            harness.calls.ingest,
            0
        );
    }
);

test(
    "failed ingestion persists bounded retry state",
    async () => {
        const harness =
            createHarness({
                ingestError:
                    new Error("network"),
                state: {
                    status: "succeeded",
                    lastSuccessfulUpdatedAt:
                        "2026-09-10T00:00:00.000Z",
                    lastSuccessfulSize: 100,
                    failureCount: 0
                }
            });

        const result =
            await harness.engine.syncOnce();

        assert.strictEqual(
            result.failed,
            1
        );
        assert.strictEqual(
            harness.calls.failed,
            1
        );
        assert.strictEqual(
            harness.getState().status,
            "failed"
        );
        assert.strictEqual(
            harness.getState().lastErrorCode,
            "ingestion_failed"
        );
    }
);

test(
    "in progress state is recovered by a later sync run",
    async () => {
        const harness =
            createHarness({
                state: {
                    status: "in_progress",
                    lastSuccessfulUpdatedAt:
                        null,
                    lastSuccessfulSize:
                        null,
                    failureCount: 0
                }
            });

        const result =
            await harness.engine.syncOnce();

        assert.strictEqual(
            result.attempted,
            1
        );
        assert.strictEqual(
            result.succeeded,
            1
        );
    }
);

test(
    "relative path eligibility limits synchronization to selected files",
    async () => {
        const harness =
            createHarness();

        const result =
            await harness.engine.syncOnce({
                relativePaths: [
                    "other.xlsx"
                ]
            });

        assert.strictEqual(
            result.attempted,
            0
        );
        assert.strictEqual(
            result.skipped,
            1
        );
        assert.strictEqual(
            harness.calls.ingest,
            0
        );
    }
);

test(
    "relative path eligibility allows explicitly selected file",
    async () => {
        const harness =
            createHarness();

        const result =
            await harness.engine.syncOnce({
                relativePaths: [
                    "records/a.xlsx"
                ]
            });

        assert.strictEqual(
            result.attempted,
            1
        );
        assert.strictEqual(
            result.succeeded,
            1
        );
    }
);

test(
    "legacy .doc is not eligible for synchronization",
    () => {
        const engine =
            Object.create(
                LocalConnectorSyncEngine.prototype
            );

        assert.strictEqual(
            engine.isSupportedFile({
                relativePath: "legacy.doc",
                updatedAt:
                    "2026-09-11T00:00:00.000Z",
                size: 100,
                extension: ".doc"
            }),
            false
        );
    }
);
