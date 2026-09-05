"use strict";

class RecordChangeResolver {
    constructor({ canonicalizationCompatibilityPolicy } = {}) {
        this.canonicalizationCompatibilityPolicy = canonicalizationCompatibilityPolicy;
    }

    resolve(changeContext) {
        if (!this.isPlainObject(changeContext)) {
            return this.invalid("record_change_context_invalid");
        }

        const identityResolution = changeContext.identityResolution;
        if (!this.isPlainObject(identityResolution)) {
            return this.invalid("record_change_identity_invalid");
        }

        if (identityResolution.status !== "resolved") {
            return { status: "identity_not_resolved" };
        }

        if (!this.isNonEmptyString(identityResolution.recordId)) {
            return this.invalid("record_change_identity_invalid");
        }

        const existingRecordState = changeContext.existingRecordState;
        if (!this.isPlainObject(existingRecordState)) {
            return this.invalid("record_change_existing_state_invalid");
        }

        if (!this.isNonEmptyString(existingRecordState.recordId)) {
            return this.invalid("record_change_existing_state_invalid");
        }

        if (existingRecordState.recordId !== identityResolution.recordId) {
            return { status: "conflict" };
        }

        let compatibility;
        try {
            compatibility = this.canonicalizationCompatibilityPolicy.evaluate({
                currentVersion: changeContext.currentCanonicalizationVersion,
                existingVersion: existingRecordState.canonicalizationVersion
            });
        } catch {
            return this.invalid("canonicalization_compatibility_unavailable");
        }

        if (
            !this.isPlainObject(compatibility) ||
            !["compatible", "incompatible"].includes(compatibility.status)
        ) {
            return this.invalid("canonicalization_compatibility_invalid");
        }

        if (compatibility.status === "incompatible") {
            return {
                status: "incompatible",
                recordId: identityResolution.recordId
            };
        }

        if (
            !this.isContentHash(changeContext.currentContentHash) ||
            !this.isContentHash(existingRecordState.contentHash)
        ) {
            return this.invalid("record_change_hash_invalid");
        }

        return {
            status: changeContext.currentContentHash === existingRecordState.contentHash
                ? "unchanged_candidate"
                : "updated_candidate",
            recordId: identityResolution.recordId
        };
    }

    isContentHash(value) {
        return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
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

    invalid(errorCode) {
        return {
            status: "invalid",
            errorCode
        };
    }
}

module.exports = RecordChangeResolver;