"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

class SqliteSyncStateStore {
    constructor({ databasePath } = {}) {
        if (
            typeof databasePath !== "string" ||
            databasePath.trim() === ""
        ) {
            throw new TypeError("databasePath is required");
        }

        fs.mkdirSync(
            path.dirname(databasePath),
            { recursive: true }
        );

        this.database =
            new DatabaseSync(databasePath);

        this.database.exec(`
            CREATE TABLE IF NOT EXISTS source_document_sync_states (
                source_document_key TEXT NOT NULL PRIMARY KEY,
                relative_path_lookup_key TEXT NOT NULL,
                status TEXT NOT NULL,
                last_successful_updated_at TEXT,
                last_successful_size INTEGER,
                last_successful_at TEXT,
                last_attempt_at TEXT,
                failure_count INTEGER NOT NULL DEFAULT 0,
                next_retry_at TEXT,
                last_error_code TEXT
            )
        `);
    }

    get(sourceDocumentKey) {
        this.assertNonEmptyString(
            sourceDocumentKey,
            "sourceDocumentKey"
        );

        const row =
            this.database.prepare(`
                SELECT
                    source_document_key,
                    relative_path_lookup_key,
                    status,
                    last_successful_updated_at,
                    last_successful_size,
                    last_successful_at,
                    last_attempt_at,
                    failure_count,
                    next_retry_at,
                    last_error_code
                FROM source_document_sync_states
                WHERE source_document_key = ?
            `).get(sourceDocumentKey);

        return row
            ? this.toState(row)
            : null;
    }

    markAttempt({
        sourceDocumentKey,
        relativePathLookupKey,
        attemptedAt
    } = {}) {
        this.assertIdentity({
            sourceDocumentKey,
            relativePathLookupKey
        });
        this.assertNonEmptyString(
            attemptedAt,
            "attemptedAt"
        );

        this.database.prepare(`
            INSERT INTO source_document_sync_states (
                source_document_key,
                relative_path_lookup_key,
                status,
                last_attempt_at
            )
            VALUES (?, ?, 'in_progress', ?)
            ON CONFLICT(source_document_key)
            DO UPDATE SET
                relative_path_lookup_key =
                    excluded.relative_path_lookup_key,
                status = 'in_progress',
                last_attempt_at =
                    excluded.last_attempt_at
        `).run(
            sourceDocumentKey,
            relativePathLookupKey,
            attemptedAt
        );

        return this.get(sourceDocumentKey);
    }

    markSucceeded({
        sourceDocumentKey,
        relativePathLookupKey,
        updatedAt,
        size,
        syncedAt
    } = {}) {
        this.assertIdentity({
            sourceDocumentKey,
            relativePathLookupKey
        });
        this.assertNonEmptyString(
            updatedAt,
            "updatedAt"
        );
        this.assertNonEmptyString(
            syncedAt,
            "syncedAt"
        );

        if (
            !Number.isFinite(size) ||
            size < 0
        ) {
            throw new TypeError(
                "size is invalid"
            );
        }

        this.database.prepare(`
            INSERT INTO source_document_sync_states (
                source_document_key,
                relative_path_lookup_key,
                status,
                last_successful_updated_at,
                last_successful_size,
                last_successful_at,
                last_attempt_at,
                failure_count,
                next_retry_at,
                last_error_code
            )
            VALUES (
                ?, ?, 'succeeded',
                ?, ?, ?, ?,
                0, NULL, NULL
            )
            ON CONFLICT(source_document_key)
            DO UPDATE SET
                relative_path_lookup_key =
                    excluded.relative_path_lookup_key,
                status = 'succeeded',
                last_successful_updated_at =
                    excluded.last_successful_updated_at,
                last_successful_size =
                    excluded.last_successful_size,
                last_successful_at =
                    excluded.last_successful_at,
                last_attempt_at =
                    excluded.last_attempt_at,
                failure_count = 0,
                next_retry_at = NULL,
                last_error_code = NULL
        `).run(
            sourceDocumentKey,
            relativePathLookupKey,
            updatedAt,
            size,
            syncedAt,
            syncedAt
        );

        return this.get(sourceDocumentKey);
    }

    markFailed({
        sourceDocumentKey,
        relativePathLookupKey,
        attemptedAt,
        nextRetryAt,
        errorCode = "ingestion_failed"
    } = {}) {
        this.assertIdentity({
            sourceDocumentKey,
            relativePathLookupKey
        });
        this.assertNonEmptyString(
            attemptedAt,
            "attemptedAt"
        );
        this.assertNonEmptyString(
            nextRetryAt,
            "nextRetryAt"
        );
        this.assertNonEmptyString(
            errorCode,
            "errorCode"
        );

        this.database.prepare(`
            INSERT INTO source_document_sync_states (
                source_document_key,
                relative_path_lookup_key,
                status,
                last_attempt_at,
                failure_count,
                next_retry_at,
                last_error_code
            )
            VALUES (
                ?, ?, 'failed',
                ?, 1, ?, ?
            )
            ON CONFLICT(source_document_key)
            DO UPDATE SET
                relative_path_lookup_key =
                    excluded.relative_path_lookup_key,
                status = 'failed',
                last_attempt_at =
                    excluded.last_attempt_at,
                failure_count =
                    source_document_sync_states.failure_count + 1,
                next_retry_at =
                    excluded.next_retry_at,
                last_error_code =
                    excluded.last_error_code
        `).run(
            sourceDocumentKey,
            relativePathLookupKey,
            attemptedAt,
            nextRetryAt,
            errorCode
        );

        return this.get(sourceDocumentKey);
    }

    assertIdentity({
        sourceDocumentKey,
        relativePathLookupKey
    }) {
        this.assertNonEmptyString(
            sourceDocumentKey,
            "sourceDocumentKey"
        );
        this.assertNonEmptyString(
            relativePathLookupKey,
            "relativePathLookupKey"
        );
    }

    assertNonEmptyString(value, name) {
        if (
            typeof value !== "string" ||
            value.trim() === ""
        ) {
            throw new TypeError(
                `${name} is required`
            );
        }
    }

    toState(row) {
        return {
            sourceDocumentKey:
                row.source_document_key,
            relativePathLookupKey:
                row.relative_path_lookup_key,
            status:
                row.status,
            lastSuccessfulUpdatedAt:
                row.last_successful_updated_at,
            lastSuccessfulSize:
                row.last_successful_size,
            lastSuccessfulAt:
                row.last_successful_at,
            lastAttemptAt:
                row.last_attempt_at,
            failureCount:
                row.failure_count,
            nextRetryAt:
                row.next_retry_at,
            lastErrorCode:
                row.last_error_code
        };
    }

    close() {
        this.database.close();
    }
}

module.exports = SqliteSyncStateStore;
