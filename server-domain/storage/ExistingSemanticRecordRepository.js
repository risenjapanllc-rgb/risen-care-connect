"use strict";

/**
 * Existing Semantic Record Repository Interface / Contract
 *
 * Responsibility:
 * - retrieve an existing semantic record state
 * - scope lookup by verified facilityId + resolved recordId
 * - return only fields required by RecordChangeResolver
 *
 * Security:
 * - facilityId must come from verifiedContext
 * - recordId must come from RecordIdentityResolver
 * - client-supplied facilityId / recordId must never be used here
 */
class ExistingSemanticRecordRepository {
    async getByRecordId({
        facilityId,
        recordId
    } = {}) {
        if (
            !this.isNonEmptyString(facilityId) ||
            !this.isNonEmptyString(recordId)
        ) {
            return null;
        }

        throw new Error(
            "ExistingSemanticRecordRepository.getByRecordId is not yet implemented. " +
            "Subclass or mock this method in tests."
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
    ExistingSemanticRecordRepository;
