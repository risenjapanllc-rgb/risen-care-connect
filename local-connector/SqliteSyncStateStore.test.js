"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SqliteSyncStateStore =
    require("./SqliteSyncStateStore");

function createStore() {
    const directory =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "risen-sync-state-"
            )
        );

    const databasePath =
        path.join(
            directory,
            "connector.sqlite"
        );

    return {
        directory,
        store:
            new SqliteSyncStateStore({
                databasePath
            })
    };
}

test(
    "sync state persists attempt and successful source metadata",
    () => {
        const temp = createStore();

        try {
            temp.store.markAttempt({
                sourceDocumentKey: "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx",
                attemptedAt:
                    "2026-09-11T00:00:00.000Z"
            });

            const attempted =
                temp.store.get("doc-1");

            assert.strictEqual(
                attempted.status,
                "in_progress"
            );

            temp.store.markSucceeded({
                sourceDocumentKey: "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx",
                updatedAt:
                    "2026-09-11T00:01:00.000Z",
                size: 123,
                syncedAt:
                    "2026-09-11T00:02:00.000Z"
            });

            const succeeded =
                temp.store.get("doc-1");

            assert.strictEqual(
                succeeded.status,
                "succeeded"
            );
            assert.strictEqual(
                succeeded.lastSuccessfulUpdatedAt,
                "2026-09-11T00:01:00.000Z"
            );
            assert.strictEqual(
                succeeded.lastSuccessfulSize,
                123
            );
            assert.strictEqual(
                succeeded.failureCount,
                0
            );
            assert.strictEqual(
                succeeded.nextRetryAt,
                null
            );
        } finally {
            temp.store.close();
            fs.rmSync(
                temp.directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "failed attempts increment retry state without deleting last success",
    () => {
        const temp = createStore();

        try {
            temp.store.markSucceeded({
                sourceDocumentKey: "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx",
                updatedAt:
                    "2026-09-11T00:01:00.000Z",
                size: 123,
                syncedAt:
                    "2026-09-11T00:02:00.000Z"
            });

            temp.store.markFailed({
                sourceDocumentKey: "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx",
                attemptedAt:
                    "2026-09-11T00:03:00.000Z",
                nextRetryAt:
                    "2026-09-11T00:04:00.000Z"
            });

            temp.store.markFailed({
                sourceDocumentKey: "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx",
                attemptedAt:
                    "2026-09-11T00:04:00.000Z",
                nextRetryAt:
                    "2026-09-11T00:06:00.000Z"
            });

            const state =
                temp.store.get("doc-1");

            assert.strictEqual(
                state.status,
                "failed"
            );
            assert.strictEqual(
                state.failureCount,
                2
            );
            assert.strictEqual(
                state.lastSuccessfulUpdatedAt,
                "2026-09-11T00:01:00.000Z"
            );
            assert.strictEqual(
                state.lastSuccessfulSize,
                123
            );
            assert.strictEqual(
                state.lastErrorCode,
                "ingestion_failed"
            );
        } finally {
            temp.store.close();
            fs.rmSync(
                temp.directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "sync state survives database reopen",
    () => {
        const temp = createStore();
        const databasePath =
            path.join(
                temp.directory,
                "connector.sqlite"
            );

        temp.store.markSucceeded({
            sourceDocumentKey: "doc-1",
            relativePathLookupKey:
                "records/a.xlsx",
            updatedAt:
                "2026-09-11T00:01:00.000Z",
            size: 123,
            syncedAt:
                "2026-09-11T00:02:00.000Z"
        });

        temp.store.close();

        const reopened =
            new SqliteSyncStateStore({
                databasePath
            });

        try {
            assert.strictEqual(
                reopened.get("doc-1").status,
                "succeeded"
            );
        } finally {
            reopened.close();
            fs.rmSync(
                temp.directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);
