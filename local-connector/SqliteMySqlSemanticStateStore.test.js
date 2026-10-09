"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const fs =
    require("node:fs");

const os =
    require("node:os");

const path =
    require("node:path");

const {
    DatabaseSync
} = require("node:sqlite");

const SqliteMySqlSemanticStateStore =
    require(
        "./SqliteMySqlSemanticStateStore"
    );

function createFixture() {
    const directory =
        fs.mkdtempSync(
            path.join(
                os.tmpdir(),
                "risen-mysql-semantic-state-"
            )
        );

    const databasePath =
        path.join(
            directory,
            "state.sqlite"
        );

    return {
        directory,
        databasePath
    };
}

test(
    "returns null before a semantic record has been persisted",
    () => {
        const {
            directory,
            databasePath
        } = createFixture();

        const database =
            new DatabaseSync(
                databasePath
            );

        try {
            const store =
                new SqliteMySqlSemanticStateStore({
                    database
                });

            const result =
                store.get({
                    sourceId:
                        "source-1",
                    sourceRecordKey:
                        "a".repeat(64),
                    semanticType:
                        "resident_profile",
                    logicalSlot:
                        "primary"
                });

            assert.strictEqual(
                result,
                null
            );
        } finally {
            database.close();

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
    "persisted semantic hash survives database reopen",
    () => {
        const {
            directory,
            databasePath
        } = createFixture();

        try {
            {
                const database =
                    new DatabaseSync(
                        databasePath
                    );

                const store =
                    new SqliteMySqlSemanticStateStore({
                        database
                    });

                store.markPersisted({
                    sourceId:
                        "source-1",
                    sourceRecordKey:
                        "a".repeat(64),
                    semanticType:
                        "resident_profile",
                    logicalSlot:
                        "primary",
                    contentHash:
                        "b".repeat(64),
                    recordId:
                        "11111111-1111-4111-8111-111111111111",
                    sourceRevision:
                        "c".repeat(64),
                    updatedAt:
                        "2026-10-09T00:00:00.000Z"
                });

                database.close();
            }

            {
                const database =
                    new DatabaseSync(
                        databasePath
                    );

                const store =
                    new SqliteMySqlSemanticStateStore({
                        database
                    });

                assert.deepStrictEqual(
                    store.get({
                        sourceId:
                            "source-1",
                        sourceRecordKey:
                            "a".repeat(64),
                        semanticType:
                            "resident_profile",
                        logicalSlot:
                            "primary"
                    }),
                    {
                        sourceId:
                            "source-1",
                        sourceRecordKey:
                            "a".repeat(64),
                        semanticType:
                            "resident_profile",
                        logicalSlot:
                            "primary",
                        lastContentHash:
                            "b".repeat(64),
                        recordId:
                            "11111111-1111-4111-8111-111111111111",
                        lastSourceRevision:
                            "c".repeat(64),
                        updatedAt:
                            "2026-10-09T00:00:00.000Z"
                    }
                );

                database.close();
            }
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
    "subsequent persistence replaces only the current semantic state",
    () => {
        const {
            directory,
            databasePath
        } = createFixture();

        const database =
            new DatabaseSync(
                databasePath
            );

        try {
            const store =
                new SqliteMySqlSemanticStateStore({
                    database
                });

            const identity = {
                sourceId:
                    "source-1",
                sourceRecordKey:
                    "a".repeat(64),
                semanticType:
                    "resident_profile",
                logicalSlot:
                    "primary"
            };

            store.markPersisted({
                ...identity,
                contentHash:
                    "b".repeat(64),
                recordId:
                    "11111111-1111-4111-8111-111111111111",
                sourceRevision:
                    "c".repeat(64),
                updatedAt:
                    "2026-10-09T00:00:00.000Z"
            });

            store.markPersisted({
                ...identity,
                contentHash:
                    "d".repeat(64),
                recordId:
                    "11111111-1111-4111-8111-111111111111",
                sourceRevision:
                    "e".repeat(64),
                updatedAt:
                    "2026-10-09T00:01:00.000Z"
            });

            const result =
                store.get(
                    identity
                );

            assert.strictEqual(
                result.lastContentHash,
                "d".repeat(64)
            );

            assert.strictEqual(
                result.lastSourceRevision,
                "e".repeat(64)
            );

            const count =
                database.prepare(`
                    SELECT count(*) AS count
                    FROM mysql_semantic_states
                `).get();

            assert.strictEqual(
                count.count,
                1
            );
        } finally {
            database.close();

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
    "different logical source records maintain independent optimistic-lock state",
    () => {
        const {
            directory,
            databasePath
        } = createFixture();

        const database =
            new DatabaseSync(
                databasePath
            );

        try {
            const store =
                new SqliteMySqlSemanticStateStore({
                    database
                });

            for (
                const [
                    key,
                    hash
                ] of [
                    [
                        "a".repeat(64),
                        "c".repeat(64)
                    ],
                    [
                        "b".repeat(64),
                        "d".repeat(64)
                    ]
                ]
            ) {
                store.markPersisted({
                    sourceId:
                        "source-1",
                    sourceRecordKey:
                        key,
                    semanticType:
                        "resident_profile",
                    logicalSlot:
                        "primary",
                    contentHash:
                        hash,
                    sourceRevision:
                        "e".repeat(64),
                    updatedAt:
                        "2026-10-09T00:00:00.000Z"
                });
            }

            assert.strictEqual(
                store.get({
                    sourceId:
                        "source-1",
                    sourceRecordKey:
                        "a".repeat(64),
                    semanticType:
                        "resident_profile",
                    logicalSlot:
                        "primary"
                }).lastContentHash,
                "c".repeat(64)
            );

            assert.strictEqual(
                store.get({
                    sourceId:
                        "source-1",
                    sourceRecordKey:
                        "b".repeat(64),
                    semanticType:
                        "resident_profile",
                    logicalSlot:
                        "primary"
                }).lastContentHash,
                "d".repeat(64)
            );
        } finally {
            database.close();

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
