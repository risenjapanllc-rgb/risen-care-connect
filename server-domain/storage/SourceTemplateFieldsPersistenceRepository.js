"use strict";

class SourceTemplateFieldsPersistenceRepository {
    async register({
        verifiedFacilityId,
        verifiedConnectorId,
        templateId,
        fields
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(templateId) ||
            !Array.isArray(fields) ||
            fields.length === 0
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceTemplateFieldsPersistenceRepository.register is not implemented"
        );
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }
}

module.exports =
    SourceTemplateFieldsPersistenceRepository;
