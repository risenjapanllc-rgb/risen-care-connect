"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const Store = require("./SqliteSourceDocumentRegistryStore");

function createDatabasePath() {
    const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), "risen-registry-")
    );

    return {
        directory,
        databasePath: path.join(directory, "registry.db")
    };
}

function createObservation(overrides = {}) {
    return {
        relativePath: "support.xlsx",
        relativePathLookupKey: "support.xlsx",
        fileName: "support.xlsx",
        updatedAt: "2026-09-05T10:00:00Z",
        size: 100,
        observedAt: "2026-09-05T10:01:00Z",
        ...overrides
    };
}

function createEntry(observation, sourceDocumentKey) {
    return {
        sourceDocumentKey,
        relativePath: observation.relativePath,
        relativePathLookupKey: observation.relativePathLookupKey,
        fileName: observation.fileName,
        firstSeenAt: observation.observedAt,
        lastSeenAt: observation.observedAt,
        lastObservedUpdatedAt: observation.updatedAt,
        lastObservedSize: observation.size
    };
}

test("first observation persists a new document identity", async () => {
    const temp = createDatabasePath();
    const store = new Store({ databasePath: temp.databasePath });

    try {
        const observation = createObservation();

        const entry = await store.getOrCreate(
            observation,
            async () => createEntry(
                observation,
                "opaque-document-key-001"
            )
        );

        assert.strictEqual(
            entry.sourceDocumentKey,
            "opaque-document-key-001"
        );

        assert.strictEqual(
            store.findByLookupKey("support.xlsx").sourceDocumentKey,
            "opaque-document-key-001"
        );
    } finally {
        store.close();
        fs.rmSync(temp.directory, {
            recursive: true,
            force: true
        });
    }
});

test("same lookup key preserves identity and updates observation metadata", async () => {
    const temp = createDatabasePath();
    const store = new Store({ databasePath: temp.databasePath });

    try {
        const firstObservation = createObservation();

        const first = await store.getOrCreate(
            firstObservation,
            async () => createEntry(
                firstObservation,
                "opaque-document-key-001"
            )
        );

        let factoryCalled = false;

        const secondObservation = createObservation({
            updatedAt: "2026-09-06T10:00:00Z",
            size: 200,
            observedAt: "2026-09-06T10:01:00Z"
        });

        const second = await store.getOrCreate(
            secondObservation,
            async () => {
                factoryCalled = true;
                return createEntry(
                    secondObservation,
                    "opaque-document-key-002"
                );
            }
        );

        assert.strictEqual(factoryCalled, false);
        assert.strictEqual(
            second.sourceDocumentKey,
            first.sourceDocumentKey
        );
        assert.strictEqual(
            second.firstSeenAt,
            first.firstSeenAt
        );
        assert.strictEqual(
            second.lastObservedUpdatedAt,
            secondObservation.updatedAt
        );
        assert.strictEqual(
            second.lastObservedSize,
            secondObservation.size
        );
    } finally {
        store.close();
        fs.rmSync(temp.directory, {
            recursive: true,
            force: true
        });
    }
});

test("document identity survives close and reopen", async () => {
    const temp = createDatabasePath();

    try {
        const observation = createObservation();

        const firstStore = new Store({
            databasePath: temp.databasePath
        });

        const first = await firstStore.getOrCreate(
            observation,
            async () => createEntry(
                observation,
                "opaque-document-key-001"
            )
        );

        firstStore.close();

        const secondStore = new Store({
            databasePath: temp.databasePath
        });

        let factoryCalled = false;

        const second = await secondStore.getOrCreate(
            createObservation({
                observedAt: "2026-09-06T10:01:00Z"
            }),
            async () => {
                factoryCalled = true;
                throw new Error("factory must not run");
            }
        );

        secondStore.close();

        assert.strictEqual(factoryCalled, false);
        assert.strictEqual(
            second.sourceDocumentKey,
            first.sourceDocumentKey
        );
    } finally {
        fs.rmSync(temp.directory, {
            recursive: true,
            force: true
        });
    }
});

test("different lookup keys persist distinct document identities", async () => {
    const temp = createDatabasePath();
    const store = new Store({ databasePath: temp.databasePath });

    try {
        const firstObservation = createObservation();

        const secondObservation = createObservation({
            relativePath: "other.xlsx",
            relativePathLookupKey: "other.xlsx",
            fileName: "other.xlsx"
        });

        const first = await store.getOrCreate(
            firstObservation,
            async () => createEntry(
                firstObservation,
                "opaque-document-key-001"
            )
        );

        const second = await store.getOrCreate(
            secondObservation,
            async () => createEntry(
                secondObservation,
                "opaque-document-key-002"
            )
        );

        assert.notStrictEqual(
            first.sourceDocumentKey,
            second.sourceDocumentKey
        );

        assert.strictEqual(
            store.findByLookupKey("support.xlsx").sourceDocumentKey,
            "opaque-document-key-001"
        );

        assert.strictEqual(
            store.findByLookupKey("other.xlsx").sourceDocumentKey,
            "opaque-document-key-002"
        );
    } finally {
        store.close();
        fs.rmSync(temp.directory, {
            recursive: true,
            force: true
        });
    }
});

test("getOrCreate does not mutate observation or candidate input", async () => {
    const temp = createDatabasePath();
    const store = new Store({ databasePath: temp.databasePath });

    try {
        const observation = createObservation();
        const observationBefore = structuredClone(observation);

        const candidate = createEntry(
            observation,
            "opaque-document-key-001"
        );
        const candidateBefore = structuredClone(candidate);

        await store.getOrCreate(
            observation,
            async () => candidate
        );

        assert.deepStrictEqual(observation, observationBefore);
        assert.deepStrictEqual(candidate, candidateBefore);
    } finally {
        store.close();
        fs.rmSync(temp.directory, {
            recursive: true,
            force: true
        });
    }
});

test("registry storage contains only allowlisted document identity metadata", async () => {
    const temp = createDatabasePath();
    const store = new Store({ databasePath: temp.databasePath });

    try {
        const observation = {
            ...createObservation(),
            rawContent: "PRIVATE RAW CONTENT",
            residentId: "resident-internal-id",
            credential: "secret-credential"
        };

        const candidate = {
            ...createEntry(
                observation,
                "opaque-document-key-001"
            ),
            rawContent: "PRIVATE RAW CONTENT",
            residentId: "resident-internal-id",
            credential: "secret-credential"
        };

        await store.getOrCreate(
            observation,
            async () => candidate
        );

        const columns = store.database.prepare(
            "PRAGMA table_info(source_documents)"
        ).all().map(row => row.name);

        assert.deepStrictEqual(columns, [
            "source_document_key",
            "relative_path",
            "relative_path_lookup_key",
            "file_name",
            "first_seen_at",
            "last_seen_at",
            "last_observed_updated_at",
            "last_observed_size"
        ]);

        const stored = store.findByLookupKey("support.xlsx");

        assert.strictEqual("rawContent" in stored, false);
        assert.strictEqual("residentId" in stored, false);
        assert.strictEqual("credential" in stored, false);
    } finally {
        store.close();
        fs.rmSync(temp.directory, {
            recursive: true,
            force: true
        });
    }
});
