"use strict";

const { createHash } = require("node:crypto");

const SUPPORTED_VERSIONS = new Set([
    "risen-recipient-certificate-canonicalization-1",
    "risen-recipient-certificate-canonicalization-2"
]);

class RecipientCertificateSemanticIntegrityVerifier {
    verify({
        semanticContent,
        contentHash,
        canonicalizationVersion
    } = {}) {
        if (
            !SUPPORTED_VERSIONS.has(canonicalizationVersion) ||
            typeof contentHash !== "string" ||
            !/^[0-9a-f]{64}$/.test(contentHash) ||
            !this.isPlainObject(semanticContent)
        ) {
            return false;
        }

        const canonical = {};

        for (const key of Object.keys(semanticContent).sort()) {
            if (!key.trim()) {
                return false;
            }

            const value = semanticContent[key];

            if (typeof value !== "string") {
                return false;
            }

            canonical[key] = value;
        }

        const calculatedHash =
            createHash("sha256")
                .update(JSON.stringify(canonical), "utf8")
                .digest("hex");

        return calculatedHash === contentHash;
    }

    isPlainObject(value) {
        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );
    }
}

module.exports =
    RecipientCertificateSemanticIntegrityVerifier;
