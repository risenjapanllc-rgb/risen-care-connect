"use strict";

const { createHash } = require("node:crypto");

const CANONICALIZATION_VERSION =
    "risen-recipient-certificate-canonicalization-1";

class RecipientCertificateSemanticCanonicalizer {
    canonicalize(semanticValues) {
        if (!this.isPlainObject(semanticValues)) {
            throw new TypeError(
                "recipient certificate semantic values must be a plain object"
            );
        }

        const canonicalSemanticContent = {};

        for (const key of Object.keys(semanticValues).sort()) {
            if (
                typeof key !== "string" ||
                key.trim() === ""
            ) {
                throw new TypeError(
                    "recipient certificate semantic key is invalid"
                );
            }

            const value = semanticValues[key];

            if (typeof value !== "string") {
                throw new TypeError(
                    "recipient certificate semantic value must be a string"
                );
            }

            canonicalSemanticContent[key] = value;
        }

        const canonicalString =
            JSON.stringify(canonicalSemanticContent);

        return {
            canonicalSemanticContent,
            canonicalString,
            contentHash: createHash("sha256")
                .update(canonicalString, "utf8")
                .digest("hex"),
            canonicalizationVersion:
                CANONICALIZATION_VERSION
        };
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
    RecipientCertificateSemanticCanonicalizer;
