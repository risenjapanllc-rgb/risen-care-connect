"use strict";

class SourceFieldMappingPersistenceRepository {
    async upsert({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceFieldKey,
        standardEntityName,
        standardFieldName,
        sheetName,
        headerLabel,
        confirmedAt
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isNonEmptyString(sourceFieldKey) ||
            !this.isNonEmptyString(standardEntityName) ||
            !this.isNonEmptyString(standardFieldName) ||
            !this.isNullableString(sheetName) ||
            !this.isNullableString(headerLabel) ||
            !this.isIsoDateTime(confirmedAt)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "SourceFieldMappingPersistenceRepository.upsert is not implemented"
        );
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isNullableString(value) {
        return (
            value === null ||
            typeof value === "string"
        );
    }

    isIsoDateTime(value) {
        return (
            typeof value === "string" &&
            value.trim() !== "" &&
            !Number.isNaN(Date.parse(value))
        );
    }
}

module.exports =
    SourceFieldMappingPersistenceRepository;
