"use strict";

const {
    randomUUID
} = require("node:crypto");

class SqliteMySqlSourceStateStore {
    constructor({
        database,
        clock = () => new Date(),
        keyGenerator = () => randomUUID()
    } = {}) {
        if (
            !database ||
            typeof database.exec !== "function" ||
            typeof database.prepare !== "function"
        ) {
            throw new TypeError(
                "database is required"
            );
        }

        this.database = database;
        this.clock = clock;
        this.keyGenerator = keyGenerator;

        this.database.exec(`
            CREATE TABLE IF NOT EXISTS mysql_source_states (
                source_id TEXT PRIMARY KEY,
                source_document_key TEXT NOT NULL UNIQUE,
                last_success_revision TEXT,
                last_success_at TEXT,
                last_attempt_at TEXT,
                failure_count INTEGER NOT NULL DEFAULT 0,
                next_retry_at TEXT,
                last_error_code TEXT
            )
        `);
    }

    get(sourceId) {
        this.assertSourceId(sourceId);

        const row =
            this.database.prepare(`
                SELECT
                    source_id,
                    source_document_key,
                    last_success_revision,
                    last_success_at,
                    last_attempt_at,
                    failure_count,
                    next_retry_at,
                    last_error_code
                FROM mysql_source_states
                WHERE source_id = ?
            `).get(sourceId);

        if (!row) {
            return null;
        }

        return {
            sourceId:
                row.source_id,
            sourceDocumentKey:
                row.source_document_key,
            lastSuccessRevision:
                row.last_success_revision,
            lastSuccessAt:
                row.last_success_at,
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

    getOrCreate(sourceId) {
        this.assertSourceId(sourceId);

        const existing =
            this.get(sourceId);

        if (existing) {
            return existing;
        }

        const sourceDocumentKey =
            this.keyGenerator();

        if (
            typeof sourceDocumentKey !== "string" ||
            sourceDocumentKey.trim() === "" ||
            sourceDocumentKey === sourceId
        ) {
            throw new Error(
                "opaque sourceDocumentKey unavailable"
            );
        }

        this.database.prepare(`
            INSERT OR IGNORE INTO mysql_source_states (
                source_id,
                source_document_key,
                failure_count
            )
            VALUES (?, ?, 0)
        `).run(
            sourceId,
            sourceDocumentKey
        );

        return this.get(sourceId);
    }

    markAttempt(sourceId) {
        this.getOrCreate(sourceId);

        const now =
            this.clock().toISOString();

        this.database.prepare(`
            UPDATE mysql_source_states
            SET
                last_attempt_at = ?,
                last_error_code = NULL
            WHERE source_id = ?
        `).run(
            now,
            sourceId
        );

        return this.get(sourceId);
    }

    markSuccess(
        sourceId,
        revision
    ) {
        this.assertRevision(revision);
        this.getOrCreate(sourceId);

        const now =
            this.clock().toISOString();

        this.database.prepare(`
            UPDATE mysql_source_states
            SET
                last_success_revision = ?,
                last_success_at = ?,
                last_attempt_at = ?,
                failure_count = 0,
                next_retry_at = NULL,
                last_error_code = NULL
            WHERE source_id = ?
        `).run(
            revision,
            now,
            now,
            sourceId
        );

        return this.get(sourceId);
    }

    markFailure(
        sourceId,
        {
            nextRetryAt,
            errorCode =
                "ingestion_failed"
        } = {}
    ) {
        this.getOrCreate(sourceId);

        const now =
            this.clock().toISOString();

        this.database.prepare(`
            UPDATE mysql_source_states
            SET
                last_attempt_at = ?,
                failure_count =
                    failure_count + 1,
                next_retry_at = ?,
                last_error_code = ?
            WHERE source_id = ?
        `).run(
            now,
            nextRetryAt || null,
            errorCode,
            sourceId
        );

        return this.get(sourceId);
    }

    assertSourceId(sourceId) {
        if (
            typeof sourceId !== "string" ||
            sourceId.trim() === ""
        ) {
            throw new TypeError(
                "sourceId is required"
            );
        }
    }

    assertRevision(revision) {
        if (
            typeof revision !== "string" ||
            !/^[a-f0-9]{64}$/.test(
                revision
            )
        ) {
            throw new TypeError(
                "revision is invalid"
            );
        }
    }
}

module.exports =
    SqliteMySqlSourceStateStore;
