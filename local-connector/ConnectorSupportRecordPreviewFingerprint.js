"use strict";

const crypto = require("node:crypto");

class ConnectorSupportRecordPreviewFingerprint {
    create(entries) {
        if (
            !Array.isArray(entries) ||
            entries.length < 1
        ) {
            throw new TypeError(
                "Preview fingerprint requires entries"
            );
        }

        const normalized =
            entries.map(entry =>
                this.normalizeEntry(entry)
            );

        const sourceRecordKeys =
            normalized.map(
                entry => entry.sourceRecordKey
            );

        if (
            new Set(sourceRecordKeys).size !==
                sourceRecordKeys.length
        ) {
            throw new TypeError(
                "Preview fingerprint requires unique sourceRecordKey"
            );
        }

        normalized.sort((a, b) =>
            Buffer.compare(
                Buffer.from(
                    a.sourceRecordKey,
                    "utf8"
                ),
                Buffer.from(
                    b.sourceRecordKey,
                    "utf8"
                )
            )
        );

        const hash =
            crypto.createHash("sha256");

        hash.update(
            "risen-support-record-preview-plan-1",
            "utf8"
        );

        for (const entry of normalized) {
            for (const value of [
                entry.sourceRecordKey,
                entry.residentId,
                entry.action,
                entry.recordId,
                entry.baselineHash,
                entry.targetHash
            ]) {
                const text =
                    value === null
                        ? ""
                        : value;

                hash.update(
                    `${Buffer.byteLength(text, "utf8")}:`,
                    "utf8"
                );
                hash.update(text, "utf8");
            }
        }

        return hash.digest("hex");
    }

    normalizeEntry(entry) {
        if (!this.isPlainObject(entry)) {
            throw new TypeError(
                "Preview fingerprint entry is invalid"
            );
        }

        const sourceRecordKey =
            this.normalizeRequired(
                entry.sourceRecordKey
            );

        const residentId =
            this.normalizeRequired(
                entry.residentId
            );

        const action =
            entry.action;

        if (
            action !== "new" &&
            action !== "unchanged" &&
            action !== "update"
        ) {
            throw new TypeError(
                "Preview fingerprint action is invalid"
            );
        }

        const targetHash =
            this.normalizeHash(
                entry.targetHash
            );

        let recordId = null;
        let baselineHash = null;

        if (
            action === "unchanged" ||
            action === "update"
        ) {
            recordId =
                this.normalizeRequired(
                    entry.recordId
                );

            baselineHash =
                this.normalizeHash(
                    entry.baselineHash
                );
        } else if (
            entry.recordId !== null &&
            entry.recordId !== undefined
        ) {
            throw new TypeError(
                "New preview entry cannot have recordId"
            );
        } else if (
            entry.baselineHash !== null &&
            entry.baselineHash !== undefined
        ) {
            throw new TypeError(
                "New preview entry cannot have baselineHash"
            );
        }

        return {
            sourceRecordKey,
            residentId,
            action,
            recordId,
            baselineHash,
            targetHash
        };
    }

    normalizeRequired(value) {
        if (
            typeof value !== "string" ||
            !value.trim()
        ) {
            throw new TypeError(
                "Preview fingerprint value is invalid"
            );
        }

        return value.trim();
    }

    normalizeHash(value) {
        if (
            typeof value !== "string" ||
            !/^[0-9a-f]{64}$/.test(value)
        ) {
            throw new TypeError(
                "Preview fingerprint hash is invalid"
            );
        }

        return value;
    }

    isPlainObject(value) {
        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );
    }
}

module.exports =
    ConnectorSupportRecordPreviewFingerprint;
