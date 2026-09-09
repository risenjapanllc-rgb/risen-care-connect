"use strict";

const path = require("path");

class SourceDocumentRegistry {
    constructor({
        sourceDocumentKeyGenerator,
        registryStore,
        relativePathLookupKeyBuilder
    } = {}) {
        if (
            !sourceDocumentKeyGenerator ||
            !registryStore ||
            !relativePathLookupKeyBuilder
        ) {
            throw new Error("SourceDocumentRegistry requires generator, store, and lookup key builder");
        }

        this.sourceDocumentKeyGenerator = sourceDocumentKeyGenerator;
        this.registryStore = registryStore;
        this.relativePathLookupKeyBuilder = relativePathLookupKeyBuilder;
    }

    async observe(observation) {
        this.assertObservation(observation);

        const relativePathLookupKey =
            this.relativePathLookupKeyBuilder.build(observation.relativePath);
        if (!this.isRelativePath(relativePathLookupKey)) {
            throw new TypeError("relativePathLookupKey is invalid");
        }

        const observedAt = new Date().toISOString();
        const entry = await this.registryStore.getOrCreate(
            {
                relativePath: observation.relativePath,
                relativePathLookupKey,
                fileName: observation.fileName,
                updatedAt: observation.updatedAt,
                size: observation.size,
                observedAt
            },
            async () => this.createEntry(
                observation,
                relativePathLookupKey,
                observedAt
            )
        );

        const registryEntry =
            this.toRegistryEntry(
                entry,
                relativePathLookupKey
            );

        const changeType =
            entry.changeType || "new";

        if (
            !["new", "updated", "unchanged"]
                .includes(changeType)
        ) {
            throw new Error(
                "registryStore returned an invalid changeType"
            );
        }

        Object.defineProperty(
            registryEntry,
            "changeType",
            {
                value: changeType,
                enumerable: false,
                writable: false,
                configurable: false
            }
        );

        return registryEntry;
    }

    async createEntry(observation, relativePathLookupKey, observedAt) {
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
            relativePathLookupKey,
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

    toRegistryEntry(entry, relativePathLookupKey) {
        if (
            !this.isPlainObject(entry) ||
            entry.relativePathLookupKey !== relativePathLookupKey
        ) {
            throw new Error("registryStore returned an invalid entry");
        }

        const keys = [
            "sourceDocumentKey",
            "relativePath",
            "relativePathLookupKey",
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
            relativePathLookupKey: entry.relativePathLookupKey,
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
            !path.win32.isAbsolute(value) &&
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
