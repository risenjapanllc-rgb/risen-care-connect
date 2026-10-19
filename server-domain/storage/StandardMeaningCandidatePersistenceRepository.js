"use strict";

class StandardMeaningCandidatePersistenceRepository {
    async list({
        verifiedFacilityId,
        verifiedConnectorId,
        templateId
    } = {}) {
        if (
            !this.nonEmpty(verifiedFacilityId) ||
            !this.nonEmpty(verifiedConnectorId) ||
            !this.nonEmpty(templateId)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "StandardMeaningCandidatePersistenceRepository.list is not implemented"
        );
    }

    async submit({
        verifiedFacilityId,
        verifiedConnectorId,
        templateId,
        templateFieldKey,
        proposedMeaning,
        evidence,
        submittedAt
    } = {}) {
        if (
            !this.nonEmpty(verifiedFacilityId) ||
            !this.nonEmpty(verifiedConnectorId) ||
            !this.nonEmpty(templateId) ||
            !this.nonEmpty(templateFieldKey) ||
            !this.nonEmpty(proposedMeaning) ||
            !this.isoDate(submittedAt) ||
            !this.isPlainObject(evidence)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "StandardMeaningCandidatePersistenceRepository.submit is not implemented"
        );
    }

    async clarify({
        verifiedFacilityId,
        verifiedConnectorId,
        templateId,
        templateFieldKey,
        staffClarification,
        clarifiedAt
    } = {}) {
        if (
            !this.nonEmpty(verifiedFacilityId) ||
            !this.nonEmpty(verifiedConnectorId) ||
            !this.nonEmpty(templateId) ||
            !this.nonEmpty(templateFieldKey) ||
            !this.nonEmpty(staffClarification) ||
            !this.isoDate(clarifiedAt)
        ) {
            return {
                status: "invalid"
            };
        }

        throw new Error(
            "StandardMeaningCandidatePersistenceRepository.clarify is not implemented"
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

    isPlainObject(value) {
        return (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }
}

module.exports =
    StandardMeaningCandidatePersistenceRepository;
