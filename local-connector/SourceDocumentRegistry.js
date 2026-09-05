"use strict";

const path = require("path");

class SourceDocumentRegistry {
    constructor({ sourceDocumentKeyGenerator, registryStore } = {}) {
        if (!sourceDocumentKeyGenerator || !registryStore) {
            throw new Error("SourceDocumentRegistry requires generator and store");
        }

        this.sourceDocumentKeyGenerator = sourceDocumentKeyGenerator;
        this.registryStore = registryStore;
    }

    async observe(observation) {
        this.assertObservation(observation);

        const observedAt = new Date().toISOString();
        const entry = await this.registryStore.getOrCreate(
            {
                relativePath: observation.relativePath,
                fileName: observation.fileName,
                updatedAt: observation.updatedAt,
                size: observation.size,
                observedAt
            },
            async () => this.createEntry(observation, observedAt)
        );

        return this.toRegistryEntry(entry, observation.relativePath);
    }

    async createEntry(observation, observedAt) {
        const sourceDocumentKey = await this.sourceDocumentKeyGenerator.generate();
        if (
            !this.isNonEmptyString(sourceDocumentKey) ||
            sourceDocumentKey === observation.relativePath ||
            sourceDocumentKey === observation.fileName
        ) {
            throw new Error("sourceDocumentKey generator returned an invalid key");
        }

        return {
            sourceDocumentKey,
            relativePath: observation.relativePath,
            fileName: observation.fileName,
            firstSeenAt: observedAt,
            lastSeenAt: observedAt,
            lastObservedUpdatedAt: observation.updatedAt,
            lastObservedSize: observation.size
        };
    }

    assertObservation(observation) {
        if (!this.isPlainObject(observation)) {
            throw new TypeError("observation must be a plain object");
        }

        if (
            !this.isRelativePath(observation.relativePath) ||
            !this.isNonEmptyString(observation.fileName) ||
            !this.isNonEmptyString(observation.updatedAt) ||
            !Number.isFinite(observation.size) ||
            observation.size < 0
        ) {
            throw new TypeError("observation is invalid");
        }
    }

    toRegistryEntry(entry, relativePath) {
        if (!this.isPlainObject(entry) || entry.relativePath !== relativePath) {
            throw new Error("registryStore returned an invalid entry");
        }

        const keys = [
            "sourceDocumentKey",
            "relativePath",
            "fileName",
            "firstSeenAt",
            "lastSeenAt",
            "lastObservedUpdatedAt"
        ];
        for (const key of keys) {
            if (!this.isNonEmptyString(entry[key])) {
                throw new Error("registryStore returned an invalid entry");
            }
        }
        if (!Number.isFinite(entry.lastObservedSize) || entry.lastObservedSize < 0) {
            throw new Error("registryStore returned an invalid entry");
        }

        return {
            sourceDocumentKey: entry.sourceDocumentKey,
            relativePath: entry.relativePath,
            fileName: entry.fileName,
            firstSeenAt: entry.firstSeenAt,
            lastSeenAt: entry.lastSeenAt,
            lastObservedUpdatedAt: entry.lastObservedUpdatedAt,
            lastObservedSize: entry.lastObservedSize
        };
    }

    isRelativePath(value) {
        return (
            this.isNonEmptyString(value) &&
            !path.isAbsolute(value) &&
            !value.split(/[\\/]+/).includes("..")
        );
    }

    isNonEmptyString(value) {
        return typeof value === "string" && value.trim() !== "";
    }

    isPlainObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }
}

module.exports = SourceDocumentRegistry;