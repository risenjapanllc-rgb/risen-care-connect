"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const MySqlSyncEngine =
    require("./MySqlSyncEngine");

const MySqlResidentProfileSemanticProjector =
    require(
        "./MySqlResidentProfileSemanticProjector"
    );

function createSourceStateStore() {
    const state = {
        sourceId:
            "residents",
        sourceDocumentKey:
            "opaque-source-key",
        lastSuccessRevision:
            null,
        lastSuccessAt:
            null,
        lastAttemptAt:
            null,
        failureCount:
            0,
        nextRetryAt:
            null,
        lastErrorCode:
            null
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
                "2026-10-09T00:00:00.000Z";
        },

        markSuccess(
            sourceId,
            revision
        ) {
            state.lastSuccessRevision =
                revision;

            state.failureCount =
                0;

            state.nextRetryAt =
                null;

            state.lastErrorCode =
                null;
        },

        markFailure(
            sourceId,
            {
                nextRetryAt,
                errorCode
            }
        ) {
            state.failureCount +=
                1;

            state.nextRetryAt =
                nextRetryAt;

            state.lastErrorCode =
                errorCode;
        }
    };
}

function createSemanticStateStore() {
    const values =
        new Map();

    const keyOf =
        input =>
            [
                input.sourceId,
                input.sourceRecordKey,
                input.semanticType,
                input.logicalSlot
            ].join("|");

    return {
        values,

        get(input) {
            return (
                values.get(
                    keyOf(input)
                ) ||
                null
            );
        },

        markPersisted(input) {
            const value = {
                sourceId:
                    input.sourceId,
                sourceRecordKey:
                    input.sourceRecordKey,
                semanticType:
                    input.semanticType,
                logicalSlot:
                    input.logicalSlot,
                lastContentHash:
                    input.contentHash,
                recordId:
                    input.recordId ??
                    null,
                lastSourceRevision:
                    input.sourceRevision
            };

            values.set(
                keyOf(input),
                value
            );

            return value;
        }
    };
}

function createEngine({
    matches,
    associationResult =
        () => ({
            status:
                "created"
        }),
    semanticResult =
        () => ({
            status:
                "created",
            recordId:
                "11111111-1111-4111-8111-111111111111"
        }),
    sourceStateStore =
        createSourceStateStore(),
    semanticStateStore =
        createSemanticStateStore()
} = {}) {
    const revision =
        "a".repeat(64);

    const rows = [
        {
            resident_code:
                "R001",
            name:
                "山田 太郎",
            birth_date:
                "1980-04-12"
        },
        {
            resident_code:
                "R002",
            name:
                "佐藤 花子",
            birth_date:
                "1975-09-03"
        }
    ];

    const projectedRecords =
        rows.map(
            (
                row,
                index
            ) => ({
                sourceRecordKey:
                    String(index + 1)
                        .repeat(64)
                        .slice(
                            0,
                            64
                        ),
                fields:
                    row
            })
        );

    const semanticCalls =
        [];

    const associationCalls =
        [];

    const engine =
        new MySqlSyncEngine({
            sourceAdapter: {
                async observe() {
                    return {
                        revision,
                        observedAt:
                            "2026-10-09T00:00:00.000Z"
                    };
                },

                async acquireRows() {
                    return rows;
                }
            },

            recordProjector: {
                project(input) {
                    assert.equal(
                        input.identityField,
                        "resident_code"
                    );

                    assert.equal(
                        input.revision,
                        revision
                    );

                    return projectedRecords;
                }
            },

            residentMatcher: {
                async matchRecords() {
                    return matches;
                }
            },

            associationClient: {
                async save(input) {
                    associationCalls
                        .push(input);

                    return associationResult(
                        input
                    );
                }
            },

            semanticProjector:
                new MySqlResidentProfileSemanticProjector(),

            semanticClient: {
                async save(input) {
                    semanticCalls
                        .push(input);

                    return semanticResult(
                        input,
                        semanticCalls.length - 1
                    );
                }
            },

            semanticStateStore,

            stateStore:
                sourceStateStore,

            identityField:
                "resident_code",

            residentCodeField:
                "resident_code",

            residentNameField:
                "name",

            clock:
                () =>
                    new Date(
                        "2026-10-09T00:00:00.000Z"
                    ),

            retryDelayMs:
                5000
        });

    return {
        engine,
        sourceStateStore,
        semanticStateStore,
        semanticCalls,
        associationCalls,
        projectedRecords,
        revision
    };
}

function matchedResidents() {
    return [
        {
            status:
                "matched",
            residentId:
                "11111111-1111-4111-8111-111111111111"
        },
        {
            status:
                "matched",
            residentId:
                "22222222-2222-4222-8222-222222222222"
        }
    ];
}

test(
    "unresolved residents fail closed before association or semantic persistence",
    async () => {
        const fixture =
            createEngine({
                matches: [
                    {
                        status:
                            "not_found"
                    },
                    {
                        status:
                            "matched",
                        residentId:
                            "22222222-2222-4222-8222-222222222222"
                    }
                ]
            });

        const result =
            await fixture.engine
                .syncOnce(
                    "residents"
                );

        assert.equal(
            result.errorCode,
            "mysql_resident_match_unresolved"
        );

        assert.equal(
            fixture.associationCalls.length,
            0
        );

        assert.equal(
            fixture.semanticCalls.length,
            0
        );

        assert.equal(
            fixture.sourceStateStore
                .state
                .lastSuccessRevision,
            null
        );
    }
);

test(
    "matched residents persist associations then semantic records before source success",
    async () => {
        const fixture =
            createEngine({
                matches:
                    matchedResidents()
            });

        const result =
            await fixture.engine
                .syncOnce(
                    "residents"
                );

        assert.equal(
            result.succeeded,
            1
        );

        assert.equal(
            result.persistedCount,
            2
        );

        assert.equal(
            result.semanticPersistedCount,
            2
        );

        assert.deepEqual(
            result.semanticPersistenceStatuses,
            [
                "created"
            ]
        );

        assert.equal(
            fixture.semanticCalls[0]
                .expectedContentHash,
            null
        );

        assert.deepEqual(
            fixture.semanticCalls[0]
                .semanticContent,
            {
                "user.birth_date":
                    "1980-04-12"
            }
        );

        assert.equal(
            fixture.sourceStateStore
                .state
                .lastSuccessRevision,
            fixture.revision
        );

        assert.equal(
            fixture.semanticStateStore
                .values.size,
            2
        );
    }
);

test(
    "existing semantic hash is sent as optimistic-lock expectation and updated state is accepted",
    async () => {
        const semanticStateStore =
            createSemanticStateStore();

        const oldHash =
            "f".repeat(64);

        semanticStateStore
            .markPersisted({
                sourceId:
                    "residents",
                sourceRecordKey:
                    "1".repeat(64),
                semanticType:
                    "resident_profile",
                logicalSlot:
                    "primary",
                contentHash:
                    oldHash,
                recordId:
                    "33333333-3333-4333-8333-333333333333",
                sourceRevision:
                    "e".repeat(64)
            });

        const fixture =
            createEngine({
                matches:
                    matchedResidents(),
                semanticStateStore,
                semanticResult:
                    (
                        input,
                        index
                    ) => ({
                        status:
                            index === 0
                                ? "updated"
                                : "created",
                        recordId:
                            index === 0
                                ? "33333333-3333-4333-8333-333333333333"
                                : "44444444-4444-4444-8444-444444444444"
                    })
            });

        const result =
            await fixture.engine
                .syncOnce(
                    "residents"
                );

        assert.equal(
            result.succeeded,
            1
        );

        assert.equal(
            fixture.semanticCalls[0]
                .expectedContentHash,
            oldHash
        );

        assert.notEqual(
            semanticStateStore
                .get({
                    sourceId:
                        "residents",
                    sourceRecordKey:
                        "1".repeat(64),
                    semanticType:
                        "resident_profile",
                    logicalSlot:
                        "primary"
                })
                .lastContentHash,
            oldHash
        );
    }
);

test(
    "semantic conflict fails closed and does not mark source revision successful",
    async () => {
        const fixture =
            createEngine({
                matches:
                    matchedResidents(),
                semanticResult:
                    () => ({
                        status:
                            "conflict",
                        recordId:
                            "11111111-1111-4111-8111-111111111111"
                    })
            });

        const result =
            await fixture.engine
                .syncOnce(
                    "residents"
                );

        assert.equal(
            result.errorCode,
            "mysql_semantic_persistence_conflict"
        );

        assert.equal(
            fixture.sourceStateStore
                .state
                .lastSuccessRevision,
            null
        );

        assert.equal(
            fixture.semanticStateStore
                .values.size,
            0
        );
    }
);

test(
    "association conflict prevents semantic persistence",
    async () => {
        const fixture =
            createEngine({
                matches:
                    matchedResidents(),
                associationResult:
                    () => ({
                        status:
                            "conflict"
                    })
            });

        const result =
            await fixture.engine
                .syncOnce(
                    "residents"
                );

        assert.equal(
            result.errorCode,
            "mysql_resident_association_conflict"
        );

        assert.equal(
            fixture.semanticCalls.length,
            0
        );
    }
);

test(
    "unchanged completed source revision skips acquisition and semantic persistence",
    async () => {
        const sourceStateStore =
            createSourceStateStore();

        sourceStateStore
            .state
            .lastSuccessRevision =
                "a".repeat(64);

        let acquired = 0;

        const semanticCalls =
            [];

        const engine =
            new MySqlSyncEngine({
                sourceAdapter: {
                    async observe() {
                        return {
                            revision:
                                "a".repeat(64),
                            observedAt:
                                "2026-10-09T00:00:00.000Z"
                        };
                    },

                    async acquireRows() {
                        acquired += 1;

                        return [];
                    }
                },

                recordProjector: {
                    project() {
                        return [];
                    }
                },

                residentMatcher: {
                    async matchRecords() {
                        return [];
                    }
                },

                associationClient: {
                    async save() {
                        throw new Error(
                            "must not be called"
                        );
                    }
                },

                semanticProjector: {
                    project() {
                        throw new Error(
                            "must not be called"
                        );
                    }
                },

                semanticClient: {
                    async save(input) {
                        semanticCalls.push(
                            input
                        );

                        throw new Error(
                            "must not be called"
                        );
                    }
                },

                semanticStateStore:
                    createSemanticStateStore(),

                stateStore:
                    sourceStateStore,

                identityField:
                    "resident_code",

                residentCodeField:
                    "resident_code",

                residentNameField:
                    "name"
            });

        const result =
            await engine.syncOnce(
                "residents"
            );

        assert.equal(
            result.skipped,
            1
        );

        assert.equal(
            acquired,
            0
        );

        assert.equal(
            semanticCalls.length,
            0
        );
    }
);
