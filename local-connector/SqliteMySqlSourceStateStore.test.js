"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const DatabaseSync = require("node:sqlite").DatabaseSync;

const SqliteMySqlSourceStateStore =
    require("./SqliteMySqlSourceStateStore");

function createDatabasePath() {
    const directory =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "risen-mysql-state-"
            )
        );

    return {
        directory,
        databasePath:
            path.join(
                directory,
                "state.sqlite"
            )
    };
}

test(
    "opaque MySQL source identity survives database reopen",
    () => {
        const {
            directory,
            databasePath
        } = createDatabasePath();

        try {
            const database =
                new DatabaseSync(
                    databasePath
                );

            const store =
                new SqliteMySqlSourceStateStore({
                    database,
                    keyGenerator: () =>
                        "opaque-key-001"
                });

            const first =
                store.getOrCreate(
                    "support"
                );

            assert.strictEqual(
                first.sourceDocumentKey,
                "opaque-key-001"
            );

            database.close();

            const reopenedDatabase =
                new DatabaseSync(
                    databasePath
                );

            const reopenedStore =
                new SqliteMySqlSourceStateStore({
                    database:
                        reopenedDatabase,
                    keyGenerator: () =>
                        "must-not-replace"
                });

            const second =
                reopenedStore.getOrCreate(
                    "support"
                );

            assert.strictEqual(
                second.sourceDocumentKey,
                "opaque-key-001"
            );

            reopenedDatabase.close();
        } finally {
            fs.rmSync(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "successful revision survives database reopen",
    () => {
        const {
            directory,
            databasePath
        } = createDatabasePath();

        try {
            const now =
                new Date(
                    "2026-09-11T00:00:00.000Z"
                );

            const database =
                new DatabaseSync(
                    databasePath
                );

            const store =
                new SqliteMySqlSourceStateStore({
                    database,
                    clock: () => now,
                    keyGenerator: () =>
                        "opaque-key-002"
                });

            store.markSuccess(
                "support",
                "a".repeat(64)
            );

            database.close();

            const reopenedDatabase =
                new DatabaseSync(
                    databasePath
                );

            const reopenedStore =
                new SqliteMySqlSourceStateStore({
                    database:
                        reopenedDatabase
                });

            const state =
                reopenedStore.get(
                    "support"
                );

            assert.strictEqual(
                state.sourceDocumentKey,
                "opaque-key-002"
            );

            assert.strictEqual(
                state.lastSuccessRevision,
                "a".repeat(64)
            );

            assert.strictEqual(
                state.lastSuccessAt,
                "2026-09-11T00:00:00.000Z"
            );

            reopenedDatabase.close();
        } finally {
            fs.rmSync(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "failure preserves last successful revision and retry state",
    () => {
        const {
            directory,
            databasePath
        } = createDatabasePath();

        try {
            const database =
                new DatabaseSync(
                    databasePath
                );

            const store =
                new SqliteMySqlSourceStateStore({
                    database,
                    clock: () =>
                        new Date(
                            "2026-09-11T00:00:00.000Z"
                        ),
                    keyGenerator: () =>
                        "opaque-key-003"
                });

            store.markSuccess(
                "support",
                "b".repeat(64)
            );

            store.markFailure(
                "support",
                {
                    nextRetryAt:
                        "2026-09-11T00:00:05.000Z",
                    errorCode:
                        "ingestion_failed"
                }
            );

            const state =
                store.get(
                    "support"
                );

            assert.strictEqual(
                state.lastSuccessRevision,
                "b".repeat(64)
            );

            assert.strictEqual(
                state.failureCount,
                1
            );

            assert.strictEqual(
                state.nextRetryAt,
                "2026-09-11T00:00:05.000Z"
            );

            assert.strictEqual(
                state.lastErrorCode,
                "ingestion_failed"
            );

            database.close();
        } finally {
            fs.rmSync(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "state table contains no connection credentials or SQL text columns",
    () => {
        const {
            directory,
            databasePath
        } = createDatabasePath();

        try {
            const database =
                new DatabaseSync(
                    databasePath
                );

            new SqliteMySqlSourceStateStore({
                database
            });

            const columns =
                database.prepare(
                    "PRAGMA table_info(mysql_source_states)"
                ).all().map(
                    row => row.name
                );

            for (
                const forbidden of [
                    "host",
                    "port",
                    "user",
                    "username",
                    "password",
                    "credential",
                    "query",
                    "sql"
                ]
            ) {
                assert.strictEqual(
                    columns.includes(
                        forbidden
                    ),
                    false
                );
            }

            database.close();
        } finally {
            fs.rmSync(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);
