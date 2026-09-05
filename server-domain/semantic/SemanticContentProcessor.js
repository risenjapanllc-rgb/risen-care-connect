"use strict";

class SemanticContentProcessor {
    constructor({
        semanticContentCanonicalizer,
        semanticContentHasher,
        canonicalizationVersionAuthority
    } = {}) {
        this.semanticContentCanonicalizer = semanticContentCanonicalizer;
        this.semanticContentHasher = semanticContentHasher;
        this.canonicalizationVersionAuthority = canonicalizationVersionAuthority;
    }

    process(validatedSemanticRecord) {
        if (!this.isPlainObject(validatedSemanticRecord)) {
            return this.invalid("validated_semantic_record_invalid");
        }

        if (
            !this.hasOwn(validatedSemanticRecord, "semanticContent") ||
            validatedSemanticRecord.semanticContent === undefined
        ) {
            return this.invalid("validated_semantic_content_missing");
        }

        let canonicalizationVersion;
        try {
            canonicalizationVersion = this.canonicalizationVersionAuthority.getCurrentVersion();
        } catch {
            return this.invalid("canonicalization_version_unavailable");
        }
        if (
            typeof canonicalizationVersion !== "string" ||
            canonicalizationVersion.trim() === ""
        ) {
            return this.invalid("canonicalization_version_unavailable");
        }

        let canonicalResult;
        try {
            canonicalResult = this.semanticContentCanonicalizer.canonicalize(
                validatedSemanticRecord.semanticContent
            );
        } catch {
            return this.invalid("semantic_canonicalization_failed");
        }

        if (
            !this.isPlainObject(canonicalResult) ||
            typeof canonicalResult.canonicalString !== "string"
        ) {
            return this.invalid("semantic_canonicalizer_result_invalid");
        }

        let hashResult;
        try {
            hashResult = this.semanticContentHasher.hash(canonicalResult.canonicalString);
        } catch {
            return this.invalid("semantic_hashing_failed");
        }

        if (
            !this.isPlainObject(hashResult) ||
            !/^[0-9a-f]{64}$/.test(hashResult.contentHash)
        ) {
            return this.invalid("semantic_hasher_result_invalid");
        }

        return {
            status: "processed",
            processedSemanticRecord: {
                sourceRecordContext: validatedSemanticRecord.sourceRecordContext,
                semanticContent: validatedSemanticRecord.semanticContent,
                provenance: validatedSemanticRecord.provenance,
                contentHash: hashResult.contentHash,
                processingMetadata: {
                    canonicalizationVersion
                }
            }
        };
    }

    isPlainObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    invalid(errorCode) {
        return {
            status: "invalid",
            errorCode
        };
    }
}

module.exports = SemanticContentProcessor;