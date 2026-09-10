"use strict";

/**
 * Record Identity Candidate Provider Interface / Contract
 *
 * Responsibility:
 * - retrieve semantic record identity candidates
 * - require the complete trusted lookup scope
 *
 * Trusted lookup scope:
 * - verifiedFacilityId
 * - verifiedConnectorId
 * - sourceDocumentKey
 * - sourceRecordKey
 *
 * Security:
 * - do not infer identity from contentHash, residentId, fileName,
 *   row/cell position, or other weak signals
 */
class RecordIdentityCandidateProvider {
    findCandidates({
        verifiedFacilityId,
        verifiedConnectorId,
        sourceDocumentKey,
        sourceRecordKey
    } = {}) {
        if (
            !this.isNonEmptyString(verifiedFacilityId) ||
            !this.isNonEmptyString(verifiedConnectorId) ||
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isNonEmptyString(sourceRecordKey)
        ) {
            return [];
        }

        throw new Error(
            "RecordIdentityCandidateProvider.findCandidates is not yet implemented. " +
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
    RecordIdentityCandidateProvider;
