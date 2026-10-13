"use strict";

class SourceDocumentTemplateBindingPersistenceRepository {
    async bind({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        templateId,
        matchMethod,
        matchConfidence,
        confirmedByHuman,
        confirmedAt
    } = {}) {
        if (
            !this.nonEmpty(verifiedFacilityId) ||
            !this.nonEmpty(verifiedConnectorId) ||
            !this.nonEmpty(sourceDocumentKey) ||
            !this.isoDate(sourceUpdatedAt) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            !this.nonEmpty(templateId) ||
            !this.nonEmpty(matchMethod) ||
            typeof confirmedByHuman !==
                "boolean"
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceDocumentTemplateBindingPersistenceRepository.bind is not implemented"
        );
    }

    nonEmpty(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isoDate(value) {
        return (
            this.nonEmpty(value) &&
            !Number.isNaN(
                Date.parse(value)
            )
        );
    }
}

module.exports =
    SourceDocumentTemplateBindingPersistenceRepository;
