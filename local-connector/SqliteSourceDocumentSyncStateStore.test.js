"use strict";

const assert =
    require("node:assert/strict");
const fs =
    require("node:fs");
const os =
    require("node:os");
const path =
    require("node:path");
const test =
    require("node:test");

const SqliteSyncStateStore =
    require("./SqliteSyncStateStore");

test(
    "raw source sync state is independent from semantic sync state",
    () => {
        const directory =
            fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    "risen-raw-sync-state-"
                )
            );

        const databasePath =
            path.join(
                directory,
                "connector.sqlite"
            );

        let semanticStore;
        let rawStore;

        try {
            semanticStore =
                new SqliteSyncStateStore({
                    databasePath
                });

            const SqliteSourceDocumentSyncStateStore =
                require(
                    "./SqliteSourceDocumentSyncStateStore"
                );

            rawStore =
                new SqliteSourceDocumentSyncStateStore({
                    databasePath
                });

            semanticStore.markSucceeded({
                sourceDocumentKey:
                    "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx",
                updatedAt:
                    "2026-09-11T10:00:00.000Z",
                size:
                    123,
                syncedAt:
                    "2026-09-11T10:01:00.000Z"
            });

            assert.strictEqual(
                rawStore.get(
                    "doc-1"
                ),
                null
            );

            rawStore.markSucceeded({
                sourceDocumentKey:
                    "doc-1",
                relativePathLookupKey:
                    "records/a.xlsx",
                updatedAt:
                    "2026-09-11T10:00:00.000Z",
                size:
                    123,
                syncedAt:
                    "2026-09-11T10:02:00.000Z"
            });

            assert.strictEqual(
                semanticStore
                    .get("doc-1")
                    .lastSuccessfulAt,
                "2026-09-11T10:01:00.000Z"
            );

            assert.strictEqual(
                rawStore
                    .get("doc-1")
                    .lastSuccessfulAt,
                "2026-09-11T10:02:00.000Z"
            );
        } finally {
            if (rawStore) {
                rawStore.close();
            }

            if (semanticStore) {
                semanticStore.close();
            }

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
