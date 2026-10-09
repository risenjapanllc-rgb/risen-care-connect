"use strict";

class SqliteMySqlSemanticStateStore {
    constructor({
        database
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

        this.database =
            database;

        this.database.exec(`
            CREATE TABLE IF NOT EXISTS mysql_semantic_states (
                source_id TEXT NOT NULL,
                source_record_key TEXT NOT NULL,
                semantic_type TEXT NOT NULL,
                logical_slot TEXT NOT NULL,
                last_content_hash TEXT,
                record_id TEXT,
                last_source_revision TEXT,
                updated_at TEXT NOT NULL,

                PRIMARY KEY (
                    source_id,
                    source_record_key,
                    semantic_type,
                    logical_slot
                ),

                CHECK (
                    length(source_record_key) = 64
                    AND source_record_key NOT GLOB '*[^0-9a-f]*'
                ),

                CHECK (
                    last_content_hash IS NULL
                    OR (
                        length(last_content_hash) = 64
                        AND last_content_hash NOT GLOB '*[^0-9a-f]*'
                    )
                ),

                CHECK (
                    last_source_revision IS NULL
                    OR (
                        length(last_source_revision) = 64
                        AND last_source_revision NOT GLOB '*[^0-9a-f]*'
                    )
                )
            )
        `);
    }

    get({
        sourceId,
        sourceRecordKey,
        semanticType,
        logicalSlot
    } = {}) {
        this.assertIdentity({
            sourceId,
            sourceRecordKey,
            semanticType,
            logicalSlot
        });

        const row =
            this.database.prepare(`
                SELECT
                    source_id,
                    source_record_key,
                    semantic_type,
                    logical_slot,
                    last_content_hash,
                    record_id,
                    last_source_revision,
                    updated_at
                FROM mysql_semantic_states
                WHERE source_id = ?
                  AND source_record_key = ?
                  AND semantic_type = ?
                  AND logical_slot = ?
            `).get(
                sourceId.trim(),
                sourceRecordKey,
                semanticType.trim(),
                logicalSlot.trim()
            );

        if (!row) {
            return null;
        }

        return {
            sourceId:
                row.source_id,
            sourceRecordKey:
                row.source_record_key,
            semanticType:
                row.semantic_type,
            logicalSlot:
                row.logical_slot,
            lastContentHash:
                row.last_content_hash,
            recordId:
                row.record_id,
            lastSourceRevision:
                row.last_source_revision,
            updatedAt:
                row.updated_at
        };
    }

    markPersisted({
        sourceId,
        sourceRecordKey,
        semanticType,
        logicalSlot,
        contentHash,
        recordId = null,
        sourceRevision,
        updatedAt =
            new Date().toISOString()
    } = {}) {
        this.assertIdentity({
            sourceId,
            sourceRecordKey,
            semanticType,
            logicalSlot
        });

        this.assertHash(
            contentHash,
            "contentHash"
        );

        this.assertHash(
            sourceRevision,
            "sourceRevision"
        );

        if (
            recordId !== null &&
            (
                typeof recordId !== "string" ||
                !recordId.trim()
            )
        ) {
            throw new TypeError(
                "recordId must be null or non-empty string"
            );
        }

        if (
            typeof updatedAt !== "string" ||
            !updatedAt.trim() ||
            Number.isNaN(
                Date.parse(updatedAt)
            )
        ) {
            throw new TypeError(
                "updatedAt must be a valid timestamp"
            );
        }

        this.database.prepare(`
            INSERT INTO mysql_semantic_states (
                source_id,
                source_record_key,
                semantic_type,
                logical_slot,
                last_content_hash,
                record_id,
                last_source_revision,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(
                source_id,
                source_record_key,
                semantic_type,
                logical_slot
            )
            DO UPDATE SET
                last_content_hash =
                    excluded.last_content_hash,
                record_id =
                    excluded.record_id,
                last_source_revision =
                    excluded.last_source_revision,
                updated_at =
                    excluded.updated_at
        `).run(
            sourceId.trim(),
            sourceRecordKey,
            semanticType.trim(),
            logicalSlot.trim(),
            contentHash,
            recordId === null
                ? null
                : recordId.trim(),
            sourceRevision,
            updatedAt.trim()
        );

        return this.get({
            sourceId,
            sourceRecordKey,
            semanticType,
            logicalSlot
        });
    }

    assertIdentity({
        sourceId,
        sourceRecordKey,
        semanticType,
        logicalSlot
    }) {
        for (
            const [
                name,
                value
            ] of [
                [
                    "sourceId",
                    sourceId
                ],
                [
                    "semanticType",
                    semanticType
                ],
                [
                    "logicalSlot",
                    logicalSlot
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

        this.assertHash(
            sourceRecordKey,
            "sourceRecordKey"
        );
    }

    assertHash(
        value,
        name
    ) {
        if (
            typeof value !== "string" ||
            !/^[0-9a-f]{64}$/.test(
                value
            )
        ) {
            throw new TypeError(
                `${name} must be a lowercase SHA-256 hex string`
            );
        }
    }
}

module.exports =
    SqliteMySqlSemanticStateStore;
