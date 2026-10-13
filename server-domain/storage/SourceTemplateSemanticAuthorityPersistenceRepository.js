"use strict";

class SourceTemplateSemanticAuthorityPersistenceRepository {
    async list({
        verifiedFacilityId,
        templateId
    } = {}) {
        if (
            !this.nonEmpty(verifiedFacilityId) ||
            !this.nonEmpty(templateId)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceTemplateSemanticAuthorityPersistenceRepository.list is not implemented"
        );
    }

    async confirm({
        verifiedFacilityId,
        verifiedConnectorId,
        templateId,
        templateFieldKey,
        interpretationStatus,
        mappingStatus,
        confirmedMeaning,
        standardEntityName,
        standardFieldName,
        confirmedAt
    } = {}) {
        if (
            !this.nonEmpty(verifiedFacilityId) ||
            !this.nonEmpty(verifiedConnectorId) ||
            !this.nonEmpty(templateId) ||
            !this.nonEmpty(templateFieldKey) ||
            !this.nonEmpty(interpretationStatus) ||
            !this.nonEmpty(mappingStatus) ||
            !this.isoDate(confirmedAt)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceTemplateSemanticAuthorityPersistenceRepository.confirm is not implemented"
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
    SourceTemplateSemanticAuthorityPersistenceRepository;
