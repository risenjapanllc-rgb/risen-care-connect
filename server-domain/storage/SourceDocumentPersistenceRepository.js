"use strict";

class SourceDocumentPersistenceRepository {
    async upsert({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceType,
        fileName,
        sourceContent,
        sourceUpdatedAt,
        sourceSize,
        observedAt
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isNonEmptyString(sourceType) ||
            !this.isNonEmptyString(fileName) ||
            !this.isPlainObject(sourceContent) ||
            !this.isNullableIsoDateTime(sourceUpdatedAt) ||
            !this.isNullableNonNegativeNumber(sourceSize) ||
            !this.isIsoDateTime(observedAt)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceDocumentPersistenceRepository.upsert is not implemented"
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

    isIsoDateTime(value) {
        return (
            typeof value === "string" &&
            value.trim() !== "" &&
            !Number.isNaN(Date.parse(value))
        );
    }

    isNullableIsoDateTime(value) {
        return (
            value === null ||
            this.isIsoDateTime(value)
        );
    }

    isNullableNonNegativeNumber(value) {
        return (
            value === null ||
            (
                typeof value === "number" &&
                Number.isFinite(value) &&
                value >= 0
            )
        );
    }
}

module.exports =
    SourceDocumentPersistenceRepository;
