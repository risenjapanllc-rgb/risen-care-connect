"use strict";

/**
 * Resident Repository Interface / Contract
 *
 * The Resident Repository is responsible for retrieving resident candidates
 * from a data source (Supabase, database, etc.) based on verified inputs.
 *
 * This interface defines the contract that any repository implementation
 * must fulfill. The actual database access is NOT implemented yet.
 */

class ResidentRepository {
    /**
     * Retrieve candidate residents by verified facility ID and source identifier.
     *
     * @param {Object} params
     * @param {string} params.facilityId - Verified facility ID (already confirmed by Server Trust Boundary)
     * @param {string} params.sourceResidentIdentifier - Source resident identifier from document
     *
     * @returns {Promise<Array>} Array of candidate objects with minimum fields:
     *   - id: resident ID
     *   - facilityId: facility ID
     *   - userCode: user code / employee code
     *   - name: resident name
     *   - gender: (optional) gender information
     *   - affiliation: (optional) affiliation information
     *
     * @throws {Error} If input validation fails or data source is unavailable
     *
     * Design Principles:
     * - Repository does NOT decide facility assignment or matching
     * - Repository trusts input facilityId as already verified
     * - Repository returns only candidates; matching is ResidentMatcher's responsibility
     * - Repository does NOT access local files, credentials, or unverified data
     */
    async getCandidates({ facilityId, sourceResidentIdentifier }) {
        // Minimal input validation
        if (!facilityId || !sourceResidentIdentifier) {
            return [];
        }

        // Actual database access is NOT implemented yet.
        // This is a placeholder to define the contract.
        throw new Error(
            "ResidentRepository.getCandidates is not yet implemented. " +
            "Subclass or mock this method in tests."
        );
    }
}

module.exports = ResidentRepository;
