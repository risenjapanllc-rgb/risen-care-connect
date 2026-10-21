"use strict";

class WordSourceTemplateReviewedPersistenceRepository {
    async register({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        displayName,
        documentType,
        fields,
        confirmedByHuman,
        confirmedAt
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isIsoDate(sourceUpdatedAt) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            !this.isNonEmptyString(displayName) ||
            !this.isNullableNonEmptyString(documentType) ||
            !Array.isArray(fields) ||
            fields.length === 0 ||
            confirmedByHuman !== true ||
            !this.isIsoDate(confirmedAt)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "WordSourceTemplateReviewedPersistenceRepository.register is not implemented"
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

    isIsoDate(value) {
        return (
            this.isNonEmptyString(value) &&
            !Number.isNaN(
                Date.parse(value)
            )
        );
    }
}

module.exports =
    WordSourceTemplateReviewedPersistenceRepository;
