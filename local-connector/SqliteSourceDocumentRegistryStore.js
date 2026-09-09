"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

class SqliteSourceDocumentRegistryStore {
    constructor({ databasePath } = {}) {
        if (typeof databasePath !== "string" || databasePath.trim() === "") {
            throw new TypeError("databasePath is required");
        }

        fs.mkdirSync(path.dirname(databasePath), { recursive: true });
        this.database = new DatabaseSync(databasePath);

        this.database.exec(`
            CREATE TABLE IF NOT EXISTS source_documents (
                source_document_key TEXT NOT NULL PRIMARY KEY,
                relative_path TEXT NOT NULL,
                relative_path_lookup_key TEXT NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                last_observed_updated_at TEXT NOT NULL,
                last_observed_size INTEGER NOT NULL
            )
        `);
    }

    async getOrCreate(observation, createNewEntry) {
        const existing = this.findByLookupKey(
            observation.relativePathLookupKey
        );

        if (existing) {
            return this.updateExisting(existing, observation);
        }

        const candidate = await createNewEntry();

        try {
            this.insertEntry(candidate);
            return {
                ...candidate,
                changeType: "new"
            };
        } catch (error) {
            const winner = this.findByLookupKey(
                observation.relativePathLookupKey
            );

            if (!winner) {
                throw error;
            }

            return this.updateExisting(winner, observation);
        }
    }

    findByLookupKey(relativePathLookupKey) {
        const row = this.database.prepare(`
            SELECT
                source_document_key,
                relative_path,
                relative_path_lookup_key,
                file_name,
                first_seen_at,
                last_seen_at,
                last_observed_updated_at,
                last_observed_size
            FROM source_documents
            WHERE relative_path_lookup_key = ?
        `).get(relativePathLookupKey);

        return row ? this.toEntry(row) : null;
    }

    insertEntry(entry) {
        this.database.prepare(`
            INSERT INTO source_documents (
                source_document_key,
                relative_path,
                relative_path_lookup_key,
                file_name,
                first_seen_at,
                last_seen_at,
                last_observed_updated_at,
                last_observed_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            entry.sourceDocumentKey,
            entry.relativePath,
            entry.relativePathLookupKey,
            entry.fileName,
            entry.firstSeenAt,
            entry.lastSeenAt,
            entry.lastObservedUpdatedAt,
            entry.lastObservedSize
        );
    }

    updateExisting(existing, observation) {
        const changed =
            existing.lastObservedUpdatedAt !==
                observation.updatedAt ||
            existing.lastObservedSize !==
                observation.size;

        this.database.prepare(`
            UPDATE source_documents
            SET
                relative_path = ?,
                file_name = ?,
                last_seen_at = ?,
                last_observed_updated_at = ?,
                last_observed_size = ?
            WHERE relative_path_lookup_key = ?
        `).run(
            observation.relativePath,
            observation.fileName,
            observation.observedAt,
            observation.updatedAt,
            observation.size,
            observation.relativePathLookupKey
        );

        return {
            ...existing,
            relativePath: observation.relativePath,
            fileName: observation.fileName,
            lastSeenAt: observation.observedAt,
            lastObservedUpdatedAt: observation.updatedAt,
            lastObservedSize: observation.size,
            changeType: changed
                ? "updated"
                : "unchanged"
        };
    }

    toEntry(row) {
        return {
            sourceDocumentKey: row.source_document_key,
            relativePath: row.relative_path,
            relativePathLookupKey: row.relative_path_lookup_key,
            fileName: row.file_name,
            firstSeenAt: row.first_seen_at,
            lastSeenAt: row.last_seen_at,
            lastObservedUpdatedAt: row.last_observed_updated_at,
            lastObservedSize: row.last_observed_size
        };
    }

    close() {
        this.database.close();
    }
}

module.exports = SqliteSourceDocumentRegistryStore;
