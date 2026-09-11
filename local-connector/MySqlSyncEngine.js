"use strict";

class MySqlSyncEngine {
    constructor({
        sourceAdapter,
        ingestionService,
        stateStore,
        clock = () => new Date(),
        retryDelayMs = 5000
    } = {}) {
        if (
            !sourceAdapter ||
            typeof sourceAdapter.observe !==
                "function"
        ) {
            throw new TypeError(
                "sourceAdapter is required"
            );
        }

        if (
            !ingestionService ||
            typeof ingestionService
                .ingestSource !== "function"
        ) {
            throw new TypeError(
                "ingestionService is required"
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

        this.sourceAdapter =
            sourceAdapter;
        this.ingestionService =
            ingestionService;
        this.stateStore =
            stateStore;
        this.clock =
            clock;
        this.retryDelayMs =
            retryDelayMs;
        this.busy =
            false;
    }

    async syncOnce(sourceId) {
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
                await this.ingestionService
                    .ingestSource(
                        sourceId,
                        {
                            sourceDocumentKey:
                                observation
                                    .sourceDocumentKey,
                            revision:
                                observation
                                    .revision
                        }
                    );

                this.stateStore.markSuccess(
                    sourceId,
                    observation.revision
                );

                return {
                    attempted: 1,
                    succeeded: 1,
                    failed: 0,
                    skipped: 0
                };
            } catch {
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
                        errorCode:
                            "ingestion_failed"
                    }
                );

                return {
                    attempted: 1,
                    succeeded: 0,
                    failed: 1,
                    skipped: 0
                };
            }
        } finally {
            this.busy = false;
        }
    }
}

module.exports =
    MySqlSyncEngine;
