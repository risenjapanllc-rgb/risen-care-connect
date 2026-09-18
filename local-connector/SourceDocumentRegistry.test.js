const test = require("node:test");
const assert = require("node:assert/strict");

const SourceDocumentRegistry = require("./SourceDocumentRegistry");

function createObservation(overrides = {}) {
    return {
        relativePath: "support.docx",
        fileName: "support.docx",
        updatedAt: "2026-09-05T10:00:00Z",
        size: 123,
        ...overrides
    };
}

function createEntry(observation, key = "opaque-document-key-1") {
    return {
        sourceDocumentKey: key,
        relativePath: observation.relativePath,
        relativePathLookupKey: observation.relativePathLookupKey,
        fileName: observation.fileName,
        firstSeenAt: "2026-09-05T10:00:01Z",
        lastSeenAt: "2026-09-05T10:00:01Z",
        lastObservedUpdatedAt: observation.updatedAt,
        lastObservedSize: observation.size
    };
}

function createRegistry({
    storeOverrides = {},
    generatorOverrides = {},
    lookupKeyBuilderOverrides = {}
} = {}) {
    const calls = [];
    const registryStore = {
        async getOrCreate(observation, createNewEntry) {
            calls.push({ observation, createNewEntry });

            return {
                ...(await createNewEntry()),
                changeType: "new"
            };
        },
        ...storeOverrides
    };
    const sourceDocumentKeyGenerator = {
        async generate() {
            return "opaque-document-key-1";
        },
        ...generatorOverrides
    };
    const relativePathLookupKeyBuilder = {
        build(relativePath) {
            return relativePath;
        },
        ...lookupKeyBuilderOverrides
    };

    return {
        registry: new SourceDocumentRegistry({
            registryStore,
            sourceDocumentKeyGenerator,
            relativePathLookupKeyBuilder
        }),
        calls
    };
}

test("new path creates an allowlisted registry entry from generator output", async () => {
    const observation = createObservation();
    const { registry } = createRegistry();

    const entry = await registry.observe(observation);

    assert.deepStrictEqual(Object.keys(entry), [
        "sourceDocumentKey",
        "relativePath",
        "relativePathLookupKey",
        "fileName",
        "firstSeenAt",
        "lastSeenAt",
        "lastObservedUpdatedAt",
        "lastObservedSize"
    ]);
    assert.strictEqual(entry.sourceDocumentKey, "opaque-document-key-1");
    assert.strictEqual(entry.relativePath, "support.docx");
    assert.strictEqual(entry.relativePathLookupKey, "support.docx");
});

test("passes the builder lookup key to Store and entry candidates", async () => {
    const observation = createObservation();
    const builderCalls = [];
    let candidate;
    let storeObservation;
    const { registry } = createRegistry({
        lookupKeyBuilderOverrides: {
            build(relativePath) {
                builderCalls.push(relativePath);
                return "lookup/support.docx";
            }
        },
        storeOverrides: {
            async getOrCreate(observationValue, createNewEntry) {
                storeObservation = observationValue;
                candidate = await createNewEntry();
                return candidate;
            }
        }
    });

    const entry = await registry.observe(observation);

    assert.deepStrictEqual(builderCalls, ["support.docx"]);
    assert.strictEqual(storeObservation.relativePathLookupKey, "lookup/support.docx");
    assert.strictEqual(candidate.relativePathLookupKey, "lookup/support.docx");
    assert.strictEqual(entry.relativePathLookupKey, "lookup/support.docx");
});

test("same path reuses the stored key despite updated size and time", async () => {
    const initial = createObservation();
    const rescanned = createObservation({
        updatedAt: "2026-09-06T10:00:00Z",
        size: 456
    });
    let storedEntry = createEntry({
        ...initial,
        relativePathLookupKey: initial.relativePath
    });
    let generatorCalls = 0;
    const { registry } = createRegistry({
        generatorOverrides: {
            async generate() {
                generatorCalls += 1;
                return "opaque-document-key-2";
            }
        },
        storeOverrides: {
            async getOrCreate(observation, createNewEntry) {
                if (!storedEntry) {
                    storedEntry = await createNewEntry();
                }
                storedEntry = {
                    ...storedEntry,
                    relativePathLookupKey: observation.relativePathLookupKey,
                    fileName: observation.fileName,
                    lastSeenAt: observation.observedAt,
                    lastObservedUpdatedAt: observation.updatedAt,
                    lastObservedSize: observation.size
                };
                return storedEntry;
            }
        }
    });

    const entry = await registry.observe(rescanned);

    assert.strictEqual(entry.sourceDocumentKey, "opaque-document-key-1");
    assert.strictEqual(entry.lastObservedSize, 456);
    assert.strictEqual(entry.lastObservedUpdatedAt, "2026-09-06T10:00:00Z");
    assert.strictEqual(generatorCalls, 0);
});

test("finds an allowlisted registry entry by opaque sourceDocumentKey", async () => {
    const stored = createEntry({
        ...createObservation(),
        relativePathLookupKey: "support.docx"
    });

    const { registry } = createRegistry({
        storeOverrides: {
            findBySourceDocumentKey(sourceDocumentKey) {
                return sourceDocumentKey ===
                    stored.sourceDocumentKey
                    ? stored
                    : null;
            }
        }
    });

    const entry =
        await registry.findBySourceDocumentKey(
            stored.sourceDocumentKey
        );

    assert.deepStrictEqual(
        entry,
        stored
    );

    assert.strictEqual(
        await registry.findBySourceDocumentKey(
            "opaque-document-key-missing"
        ),
        null
    );
});

test("different paths can receive distinct keys", async () => {
    let sequence = 0;
    const entries = new Map();
    const { registry } = createRegistry({
        generatorOverrides: {
            async generate() {
                sequence += 1;
                return "opaque-document-key-" + sequence;
            }
        },
        storeOverrides: {
            async getOrCreate(observation, createNewEntry) {
                if (!entries.has(observation.relativePathLookupKey)) {
                    entries.set(
                        observation.relativePathLookupKey,
                        await createNewEntry()
                    );
                }
                return entries.get(observation.relativePathLookupKey);
            }
        }
    });

    const first = await registry.observe(createObservation());
    const second = await registry.observe(createObservation({
        relativePath: "plan.docx",
        fileName: "plan.docx"
    }));

    assert.notStrictEqual(first.sourceDocumentKey, second.sourceDocumentKey);
});

test("generator output must be a non-metadata opaque key", async () => {
    for (const key of [undefined, null, "", " \n\t ", "support.docx"]) {
        const { registry } = createRegistry({
            generatorOverrides: { generate: async () => key }
        });

        await assert.rejects(() => registry.observe(createObservation()), Error);
    }
});

test("malformed observations and lookup keys are rejected", async () => {
    const { registry } = createRegistry();

    for (const observation of [
        null,
        [],
        {},
        createObservation({ relativePath: "/Users/test/support.docx" }),
        createObservation({ relativePath: "C:\\Users\\test\\support.docx" }),
        createObservation({ relativePath: "../support.docx" }),
        createObservation({ fileName: "" }),
        createObservation({ updatedAt: "" }),
        createObservation({ size: -1 })
    ]) {
        await assert.rejects(() => registry.observe(observation), TypeError);
    }

    for (const lookupKey of [
        undefined,
        null,
        "",
        " \n\t ",
        "/Users/test/support.docx",
        "C:\\Users\\test\\support.docx",
        "../support.docx"
    ]) {
        const { registry: lookupRegistry } = createRegistry({
            lookupKeyBuilderOverrides: { build: () => lookupKey }
        });
        await assert.rejects(() => lookupRegistry.observe(createObservation()), TypeError);
    }
});

test("unknown observation fields never enter the registry entry", async () => {
    const { registry } = createRegistry();
    const entry = await registry.observe(createObservation({
        contentHash: "hash",
        sourceRecordKey: "record-key",
        residentId: "resident-1",
        credential: "credential",
        content: "raw content"
    }));

    for (const key of [
        "contentHash",
        "sourceRecordKey",
        "residentId",
        "credential",
        "content"
    ]) {
        assert.strictEqual(entry[key], undefined, key);
    }
});

test("Store owns atomic get-or-create for concurrent first observations", async () => {
    const observation = createObservation();
    let storedEntry;
    let pendingEntry;
    let createCalls = 0;
    const { registry } = createRegistry({
        storeOverrides: {
            getOrCreate(_observation, createNewEntry) {
                if (storedEntry) {
                    return storedEntry;
                }
                if (!pendingEntry) {
                    createCalls += 1;
                    pendingEntry = createNewEntry().then((entry) => {
                        storedEntry = entry;
                        return entry;
                    });
                }
                return pendingEntry;
            }
        }
    });

    const [first, second] = await Promise.all([
        registry.observe(observation),
        registry.observe(observation)
    ]);

    assert.strictEqual(createCalls, 1);
    assert.strictEqual(first.sourceDocumentKey, second.sourceDocumentKey);
});

test("input is not mutated and sourceRecordKey is not generated", async () => {
    const observation = createObservation({ sourceRecordKey: "untrusted" });
    const before = JSON.stringify(observation);
    const { registry } = createRegistry();

    const entry = await registry.observe(observation);

    assert.strictEqual(JSON.stringify(observation), before);
    assert.strictEqual(entry.sourceRecordKey, undefined);
});

test("new observation returns changeType new", async () => {
    const observation = createObservation();

    const registryStore = {
        async getOrCreate(observationValue, createNewEntry) {
            return {
                ...(await createNewEntry()),
                changeType: "new"
            };
        }
    };

    const { registry } = createRegistry({
        storeOverrides: registryStore
    });

    const entry = await registry.observe(observation);

    assert.strictEqual(entry.changeType, "new");
});

test("unchanged observation returns changeType unchanged", async () => {
    const observation = createObservation();

    const registryStore = {
        async getOrCreate() {
            return {
                sourceDocumentKey: "opaque-document-key-1",
                relativePath: observation.relativePath,
                relativePathLookupKey: observation.relativePath,
                fileName: observation.fileName,
                firstSeenAt: "2026-09-05T09:00:00Z",
                lastSeenAt: "2026-09-05T09:30:00Z",
                lastObservedUpdatedAt: observation.updatedAt,
                lastObservedSize: observation.size,
                changeType: "unchanged"
            };
        }
    };

    const { registry } = createRegistry({
        storeOverrides: registryStore
    });

    const entry = await registry.observe(observation);

    assert.strictEqual(entry.changeType, "unchanged");
});

test("updated observation returns changeType updated", async () => {
    const observation = createObservation({
        updatedAt: "2026-09-05T11:00:00Z",
        size: 456
    });

    const registryStore = {
        async getOrCreate() {
            return {
                sourceDocumentKey: "opaque-document-key-1",
                relativePath: observation.relativePath,
                relativePathLookupKey: observation.relativePath,
                fileName: observation.fileName,
                firstSeenAt: "2026-09-05T09:00:00Z",
                lastSeenAt: "2026-09-05T09:30:00Z",
                lastObservedUpdatedAt: observation.updatedAt,
                lastObservedSize: observation.size,
                changeType: "updated"
            };
        }
    };

    const { registry } = createRegistry({
        storeOverrides: registryStore
    });

    const entry = await registry.observe(observation);

    assert.strictEqual(entry.changeType, "updated");
});
