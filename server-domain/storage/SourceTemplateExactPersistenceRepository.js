"use strict";

class SourceTemplateExactPersistenceRepository {
    async getOrCreate({
        verifiedFacilityId,
        verifiedConnectorId,
        displayName,
        fileType,
        documentType,
        structureFingerprint,
        canonicalizationVersion,
        canonicalStructure
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(displayName) ||
            !["csv", "excel"].includes(fileType) ||
            !this.isNullableNonEmptyString(documentType) ||
            !this.isSha256(structureFingerprint) ||
            !this.isNonEmptyString(canonicalizationVersion) ||
            !this.isPlainObject(canonicalStructure)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceTemplateExactPersistenceRepository.getOrCreate is not implemented"
        );
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isNullableNonEmptyString(value) {
        return (
            value === null ||
            this.isNonEmptyString(value)
        );
    }

    isSha256(value) {
        return (
            typeof value === "string" &&
            /^[a-f0-9]{64}$/i.test(value.trim())
        );
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
    SourceTemplateExactPersistenceRepository;
