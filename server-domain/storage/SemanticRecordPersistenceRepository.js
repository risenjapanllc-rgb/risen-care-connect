"use strict";

class SemanticRecordPersistenceRepository {
    async createConfirmedRecord({
        verifiedFacilityId,
        verifiedConnectorId,
        residentId,
        sourceDocumentKey,
        sourceRecordKey,
        contentHash,
        canonicalizationVersion,
        semanticContent
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(residentId) ||
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isNonEmptyString(sourceRecordKey) ||
            !this.isContentHash(contentHash) ||
            !this.isNonEmptyString(canonicalizationVersion) ||
            !this.isPlainObject(semanticContent)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SemanticRecordPersistenceRepository.createConfirmedRecord is not implemented"
        );
    }

    async updateConfirmedRecord({
        verifiedFacilityId,
        recordId,
        expectedContentHash,
        contentHash,
        canonicalizationVersion,
        semanticContent
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(recordId) ||
            !this.isContentHash(expectedContentHash) ||
            !this.isContentHash(contentHash) ||
            !this.isNonEmptyString(canonicalizationVersion) ||
            !this.isPlainObject(semanticContent)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SemanticRecordPersistenceRepository.updateConfirmedRecord is not implemented"
        );
    }

    isContentHash(value) {
        return (
            typeof value === "string" &&
            /^[0-9a-f]{64}$/.test(value)
        );
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
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
    SemanticRecordPersistenceRepository;
