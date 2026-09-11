"use strict";

class LocalConnectorSyncEngine {
    constructor({
        localConnectorService,
        ingestionService,
        syncStateStore,
        clock = () => new Date(),
        baseRetryMs = 5000,
        maxRetryMs = 300000
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService
                .getRegisteredFolderStatus !== "function" ||
            typeof localConnectorService
                .observeRegisteredFile !== "function"
        ) {
            throw new Error(
                "LocalConnectorSyncEngine requires localConnectorService"
            );
        }

        if (
            !ingestionService ||
            typeof ingestionService
                .ingestRegisteredFile !== "function"
        ) {
            throw new Error(
                "LocalConnectorSyncEngine requires ingestionService"
            );
        }

        if (
            !syncStateStore ||
            typeof syncStateStore.get !== "function" ||
            typeof syncStateStore.markAttempt !== "function" ||
            typeof syncStateStore.markSucceeded !== "function" ||
            typeof syncStateStore.markFailed !== "function"
        ) {
            throw new Error(
                "LocalConnectorSyncEngine requires syncStateStore"
            );
        }

        if (
            typeof clock !== "function" ||
            !Number.isFinite(baseRetryMs) ||
            baseRetryMs < 0 ||
            !Number.isFinite(maxRetryMs) ||
            maxRetryMs < baseRetryMs
        ) {
            throw new TypeError(
                "LocalConnectorSyncEngine configuration is invalid"
            );
        }

        this.localConnectorService =
            localConnectorService;
        this.ingestionService =
            ingestionService;
        this.syncStateStore =
            syncStateStore;
        this.clock =
            clock;
        this.baseRetryMs =
            baseRetryMs;
        this.maxRetryMs =
            maxRetryMs;
        this.running =
            false;
    }

    async syncOnce({
        relativePaths
    } = {}) {
        const eligibleRelativePaths =
            this.createEligibleRelativePaths(
                relativePaths
            );

        if (this.running) {
            return {
                status: "busy",
                scanned: 0,
                attempted: 0,
                succeeded: 0,
                failed: 0,
                skipped: 0
            };
        }

        this.running = true;

        try {
            const folder =
                await this.localConnectorService
                    .getRegisteredFolderStatus();

            if (
                !folder ||
                folder.status !== "ready" ||
                !Array.isArray(folder.files)
            ) {
                return {
                    status:
                        folder?.status ||
                        "unavailable",
                    scanned: 0,
                    attempted: 0,
                    succeeded: 0,
                    failed: 0,
                    skipped: 0
                };
            }

            const summary = {
                status: "completed",
                scanned: folder.files.length,
                attempted: 0,
                succeeded: 0,
                failed: 0,
                skipped: 0
            };

            for (const file of folder.files) {
                if (
                    !this.isSupportedFile(file) ||
                    (
                        eligibleRelativePaths &&
                        !eligibleRelativePaths.has(
                            file.relativePath
                        )
                    )
                ) {
                    summary.skipped += 1;
                    continue;
                }

                const observation =
                    await this.localConnectorService
                        .observeRegisteredFile(
                            file.relativePath
                        );

                if (
                    !observation ||
                    typeof observation
                        .sourceDocumentKey !== "string" ||
                    observation
                        .sourceDocumentKey
                        .trim() === "" ||
                    typeof observation
                        .relativePathLookupKey !== "string" ||
                    observation
                        .relativePathLookupKey
                        .trim() === ""
                ) {
                    throw new Error(
                        "source document identity unavailable"
                    );
                }

                const state =
                    this.syncStateStore.get(
                        observation.sourceDocumentKey
                    );

                const now =
                    this.clock();

                if (
                    !this.shouldSync({
                        file,
                        state,
                        now
                    })
                ) {
                    summary.skipped += 1;
                    continue;
                }

                const attemptedAt =
                    now.toISOString();

                this.syncStateStore.markAttempt({
                    sourceDocumentKey:
                        observation.sourceDocumentKey,
                    relativePathLookupKey:
                        observation.relativePathLookupKey,
                    attemptedAt
                });

                summary.attempted += 1;

                try {
                    await this.ingestionService
                        .ingestRegisteredFile(
                            file.relativePath
                        );

                    const syncedAt =
                        this.clock()
                            .toISOString();

                    this.syncStateStore.markSucceeded({
                        sourceDocumentKey:
                            observation.sourceDocumentKey,
                        relativePathLookupKey:
                            observation.relativePathLookupKey,
                        updatedAt:
                            file.updatedAt,
                        size:
                            file.size,
                        syncedAt
                    });

                    summary.succeeded += 1;
                } catch (error) {
                    const safeErrorCodes =
                        new Set([
                            "connector_trust_denied",
                            "connector_payload_invalid",
                            "connector_processing_unavailable",
                            "server_trust_boundary_request_failed",
                            "server_trust_boundary_unreachable",
                            "server_trust_boundary_invalid_response"
                        ]);

                    const errorCode =
                        error &&
                        typeof error.code === "string" &&
                        safeErrorCodes.has(
                            error.code
                        )
                            ? error.code
                            : "ingestion_failed";

                    const previousFailureCount =
                        Number.isInteger(
                            state?.failureCount
                        )
                            ? state.failureCount
                            : 0;

                    const retryMs =
                        Math.min(
                            this.maxRetryMs,
                            this.baseRetryMs *
                                (2 **
                                    previousFailureCount)
                        );

                    const nextRetryAt =
                        new Date(
                            now.getTime() +
                            retryMs
                        ).toISOString();

                    this.syncStateStore.markFailed({
                        sourceDocumentKey:
                            observation.sourceDocumentKey,
                        relativePathLookupKey:
                            observation.relativePathLookupKey,
                        attemptedAt,
                        nextRetryAt,
                        errorCode
                    });

                    summary.failed += 1;
                }
            }

            return summary;
        } finally {
            this.running = false;
        }
    }

    shouldSync({
        file,
        state,
        now
    }) {
        if (!state) {
            return true;
        }

        if (
            state.status === "failed" &&
            typeof state.nextRetryAt === "string"
        ) {
            const nextRetry =
                new Date(
                    state.nextRetryAt
                );

            if (
                Number.isFinite(
                    nextRetry.getTime()
                ) &&
                nextRetry > now
            ) {
                return false;
            }
        }

        if (
            state.status === "in_progress"
        ) {
            return true;
        }

        return !(
            state.status === "succeeded" &&
            state.lastSuccessfulUpdatedAt ===
                file.updatedAt &&
            state.lastSuccessfulSize ===
                file.size
        );
    }

    createEligibleRelativePaths(relativePaths) {
        if (relativePaths === undefined) {
            return null;
        }

        if (!Array.isArray(relativePaths)) {
            throw new TypeError(
                "relativePaths must be an array"
            );
        }

        const values =
            new Set();

        for (const value of relativePaths) {
            if (
                typeof value !== "string" ||
                value.trim() === ""
            ) {
                throw new TypeError(
                    "relativePaths contains an invalid path"
                );
            }

            values.add(value);
        }

        return values;
    }

    isSupportedFile(file) {
        if (
            !file ||
            typeof file !== "object" ||
            typeof file.relativePath !== "string" ||
            typeof file.updatedAt !== "string" ||
            !Number.isFinite(file.size)
        ) {
            return false;
        }

        return [
            ".docx",
            ".xls",
            ".xlsx",
            ".csv"
        ].includes(
            String(
                file.extension || ""
            ).toLowerCase()
        );
    }
}

module.exports =
    LocalConnectorSyncEngine;
