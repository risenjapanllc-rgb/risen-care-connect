"use strict";

const COMPATIBLE_CURRENT_VERSION = "risen-semantic-canonicalization-1";
const COMPATIBLE_EXISTING_VERSION = "risen-semantic-canonicalization-1";

class CanonicalizationCompatibilityPolicy {
    evaluate(versions) {
        if (!this.isPlainObject(versions)) {
            return { status: "incompatible" };
        }

        const { currentVersion, existingVersion } = versions;
        if (
            !this.isNonEmptyString(currentVersion) ||
            !this.isNonEmptyString(existingVersion)
        ) {
            return { status: "incompatible" };
        }

        if (
            currentVersion === COMPATIBLE_CURRENT_VERSION &&
            existingVersion === COMPATIBLE_EXISTING_VERSION
        ) {
            return { status: "compatible" };
        }

        return { status: "incompatible" };
    }

    isPlainObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    isNonEmptyString(value) {
        return typeof value === "string" && value.trim() !== "";
    }
}

module.exports = CanonicalizationCompatibilityPolicy;