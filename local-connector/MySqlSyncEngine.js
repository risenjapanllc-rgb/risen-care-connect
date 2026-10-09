"use strict";

class MySqlSyncEngine {
    constructor({
        sourceAdapter,
        recordProjector,
        residentMatcher,
        associationClient,
        semanticProjector,
        semanticClient,
        semanticStateStore,
        stateStore,
        identityField,
        residentCodeField,
        residentNameField,
        clock = () => new Date(),
        retryDelayMs = 5000
    } = {}) {
        if (
            !sourceAdapter ||
            typeof sourceAdapter.observe !==
                "function" ||
            typeof sourceAdapter.acquireRows !==
                "function"
        ) {
            throw new TypeError(
                "sourceAdapter is required"
            );
        }

        if (
            !recordProjector ||
            typeof recordProjector.project !==
                "function"
        ) {
            throw new TypeError(
                "recordProjector is required"
            );
        }

        if (
            !residentMatcher ||
            typeof residentMatcher.matchRecords !==
                "function"
        ) {
            throw new TypeError(
                "residentMatcher is required"
            );
        }

        if (
            !associationClient ||
            typeof associationClient.save !==
                "function"
        ) {
            throw new TypeError(
                "associationClient is required"
            );
        }

        if (
            !semanticProjector ||
            typeof semanticProjector.project !==
                "function"
        ) {
            throw new TypeError(
                "semanticProjector is required"
            );
        }

        if (
            !semanticClient ||
            typeof semanticClient.save !==
                "function"
        ) {
            throw new TypeError(
                "semanticClient is required"
            );
        }

        if (
            !semanticStateStore ||
            typeof semanticStateStore.get !==
                "function" ||
            typeof semanticStateStore.markPersisted !==
                "function"
        ) {
            throw new TypeError(
                "semanticStateStore is required"
            );
        }

        if (
            !stateStore ||
            typeof stateStore.getOrCreate !==
                "function"
        ) {
            throw new TypeError(
                "stateStore is required"
            );
        }

        for (
            const [
                name,
                value
            ] of [
                [
                    "identityField",
                    identityField
                ],
                [
                    "residentCodeField",
                    residentCodeField
                ],
                [
                    "residentNameField",
                    residentNameField
                ]
            ]
        ) {
            if (
                typeof value !== "string" ||
                !value.trim()
            ) {
                throw new TypeError(
                    `${name} is required`
                );
            }
        }

        this.sourceAdapter =
            sourceAdapter;

        this.recordProjector =
            recordProjector;

        this.residentMatcher =
            residentMatcher;

        this.associationClient =
            associationClient;

        this.semanticProjector =
            semanticProjector;

        this.semanticClient =
            semanticClient;

        this.semanticStateStore =
            semanticStateStore;

        this.stateStore =
            stateStore;

        this.identityField =
            identityField.trim();

        this.residentCodeField =
            residentCodeField.trim();

        this.residentNameField =
            residentNameField.trim();

        this.clock =
            clock;

        this.retryDelayMs =
            retryDelayMs;

        this.busy =
            false;
    }

    async syncOnce(
        sourceId
    ) {
        if (this.busy) {
            throw new Error(
                "MySQL sync already running"
            );
        }

        this.busy = true;

        try {
            const state =
                this.stateStore
                    .getOrCreate(
                        sourceId
                    );

            if (
                state.nextRetryAt &&
                Date.parse(
                    state.nextRetryAt
                ) >
                    this.clock().getTime()
            ) {
                return {
                    attempted: 0,
                    succeeded: 0,
                    failed: 0,
                    skipped: 1
                };
            }

            const observation =
                await this.sourceAdapter
                    .observe(
                        sourceId,
                        {
                            sourceDocumentKey:
                                state
                                    .sourceDocumentKey
                        }
                    );

            if (
                !observation ||
                typeof observation.revision !==
                    "string"
            ) {
                throw new Error(
                    "MySQL revision unavailable"
                );
            }

            if (
                state.lastSuccessRevision ===
                observation.revision
            ) {
                return {
                    attempted: 0,
                    succeeded: 0,
                    failed: 0,
                    skipped: 1
                };
            }

            this.stateStore.markAttempt(
                sourceId
            );

            try {
                const rows =
                    await this.sourceAdapter
                        .acquireRows(
                            sourceId
                        );

                const records =
                    this.recordProjector
                        .project({
                            sourceId,
                            identityField:
                                this.identityField,
                            rows,
                            revision:
                                observation.revision,
                            observedAt:
                                observation.observedAt
                        });

                const matches =
                    await this.residentMatcher
                        .matchRecords({
                            records,
                            residentCodeField:
                                this
                                    .residentCodeField,
                            residentNameField:
                                this
                                    .residentNameField
                        });

                const unresolved =
                    matches.filter(
                        match =>
                            match.status !==
                            "matched"
                    );

                if (
                    unresolved.length > 0
                ) {
                    return this.fail({
                        sourceId,
                        errorCode:
                            "mysql_resident_match_unresolved",
                        details: {
                            recordCount:
                                records.length,
                            matchedCount:
                                matches.length -
                                unresolved.length,
                            unresolvedCount:
                                unresolved.length,
                            unresolvedStatuses:
                                [
                                    ...new Set(
                                        unresolved.map(
                                            item =>
                                                item.status
                                        )
                                    )
                                ]
                        }
                    });
                }

                const persistedStatuses =
                    [];

                for (
                    let index = 0;
                    index < records.length;
                    index += 1
                ) {
                    const record =
                        records[index];

                    const match =
                        matches[index];

                    const result =
                        await this
                            .associationClient
                            .save({
                                sourceId,
                                sourceRecordKey:
                                    record
                                        .sourceRecordKey,
                                residentId:
                                    match
                                        .residentId,
                                matchMethod:
                                    "user_code_name_verified",
                                sourceRevision:
                                    observation
                                        .revision
                            });

                    if (
                        result.status ===
                            "conflict"
                    ) {
                        return this.fail({
                            sourceId,
                            errorCode:
                                "mysql_resident_association_conflict",
                            details: {
                                recordCount:
                                    records.length,
                                matchedCount:
                                    matches.length,
                                persistedCount:
                                    persistedStatuses
                                        .length,
                                conflictCount:
                                    1
                            }
                        });
                    }

                    if (
                        ![
                            "created",
                            "updated",
                            "unchanged"
                        ].includes(
                            result.status
                        )
                    ) {
                        return this.fail({
                            sourceId,
                            errorCode:
                                "mysql_resident_association_persistence_failed"
                        });
                    }

                    persistedStatuses
                        .push(
                            result.status
                        );
                }

                const semanticStatuses =
                    [];

                for (
                    let index = 0;
                    index < records.length;
                    index += 1
                ) {
                    const record =
                        records[index];

                    const match =
                        matches[index];

                    if (
                        !match ||
                        match.status !==
                            "matched" ||
                        typeof match.residentId !==
                            "string" ||
                        !match.residentId.trim()
                    ) {
                        return this.fail({
                            sourceId,
                            errorCode:
                                "mysql_resident_match_invalid_result"
                        });
                    }

                    const projectedSemantic =
                        this.semanticProjector
                            .project({
                                record,
                                residentId:
                                    match.residentId,
                                sourceRevision:
                                    observation.revision
                            });

                    const semanticIdentity = {
                        sourceId,
                        sourceRecordKey:
                            projectedSemantic
                                .sourceRecordKey,
                        semanticType:
                            projectedSemantic
                                .semanticType,
                        logicalSlot:
                            projectedSemantic
                                .logicalSlot
                    };

                    const currentSemanticState =
                        this.semanticStateStore
                            .get(
                                semanticIdentity
                            );

                    const semanticResult =
                        await this.semanticClient
                            .save({
                                ...semanticIdentity,
                                residentId:
                                    projectedSemantic
                                        .residentId,
                                sourceRevision:
                                    projectedSemantic
                                        .sourceRevision,
                                expectedContentHash:
                                    currentSemanticState
                                        ?.lastContentHash ??
                                    null,
                                contentHash:
                                    projectedSemantic
                                        .contentHash,
                                canonicalizationVersion:
                                    projectedSemantic
                                        .canonicalizationVersion,
                                semanticContent:
                                    projectedSemantic
                                        .semanticContent
                            });

                    if (
                        semanticResult.status ===
                            "conflict"
                    ) {
                        return this.fail({
                            sourceId,
                            errorCode:
                                "mysql_semantic_persistence_conflict",
                            details: {
                                recordCount:
                                    records.length,
                                semanticPersistedCount:
                                    semanticStatuses.length,
                                conflictCount:
                                    1
                            }
                        });
                    }

                    if (
                        semanticResult.status ===
                            "denied"
                    ) {
                        return this.fail({
                            sourceId,
                            errorCode:
                                "mysql_semantic_persistence_denied",
                            details: {
                                recordCount:
                                    records.length,
                                semanticPersistedCount:
                                    semanticStatuses.length
                            }
                        });
                    }

                    if (
                        ![
                            "created",
                            "updated",
                            "unchanged"
                        ].includes(
                            semanticResult.status
                        )
                    ) {
                        return this.fail({
                            sourceId,
                            errorCode:
                                "mysql_semantic_persistence_failed"
                        });
                    }

                    this.semanticStateStore
                        .markPersisted({
                            ...semanticIdentity,
                            contentHash:
                                projectedSemantic
                                    .contentHash,
                            recordId:
                                semanticResult
                                    .recordId ??
                                currentSemanticState
                                    ?.recordId ??
                                null,
                            sourceRevision:
                                observation
                                    .revision
                        });

                    semanticStatuses
                        .push(
                            semanticResult.status
                        );
                }

                this.stateStore
                    .markSuccess(
                        sourceId,
                        observation
                            .revision
                    );

                return {
                    attempted: 1,
                    succeeded: 1,
                    failed: 0,
                    skipped: 0,
                    recordCount:
                        records.length,
                    matchedCount:
                        matches.length,
                    persistedCount:
                        persistedStatuses
                            .length,
                    persistenceStatuses:
                        [
                            ...new Set(
                                persistedStatuses
                            )
                        ],
                    semanticPersistedCount:
                        semanticStatuses.length,
                    semanticPersistenceStatuses:
                        [
                            ...new Set(
                                semanticStatuses
                            )
                        ]
                };
            } catch (error) {
                return this.fail({
                    sourceId,
                    errorCode:
                        typeof error?.code ===
                            "string" &&
                        error.code.trim()
                            ? error.code.trim()
                            : "mysql_sync_processing_failed",
                    httpStatus:
                        Number.isInteger(
                            error?.httpStatus
                        )
                            ? error.httpStatus
                            : null
                });
            }
        } finally {
            this.busy = false;
        }
    }

    fail({
        sourceId,
        errorCode,
        httpStatus = null,
        details = null
    }) {
        const nextRetryAt =
            new Date(
                this.clock()
                    .getTime() +
                this.retryDelayMs
            ).toISOString();

        this.stateStore.markFailure(
            sourceId,
            {
                nextRetryAt,
                errorCode
            }
        );

        return {
            attempted: 1,
            succeeded: 0,
            failed: 1,
            skipped: 0,
            errorCode,
            httpStatus,
            ...(details
                ? details
                : {})
        };
    }
}

module.exports =
    MySqlSyncEngine;
