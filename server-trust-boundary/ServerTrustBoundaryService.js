"use strict";

/**
 * RISEN CARE Server Trust Boundary Service
 *
 * This service orchestrates the core responsibility separation within the
 * Server Trust Boundary:
 *
 * 1. Receives a verified context containing an already-confirmed facilityId
 * 2. Requests candidate residents from ResidentRepository using verified facilityId
 * 3. Delegates matching decision to ResidentMatcher
 * 4. Returns the matching result
 *
 * Security Principles:
 * - Does NOT trust client-supplied facilityId, residentId, or any role/permission
 * - Does NOT make matching decisions (ResidentMatcher is responsible)
 * - Does NOT access local files, credentials, or unverified data
 * - Maintains Default Deny: if required inputs are missing, does not proceed
 */

class ServerTrustBoundaryService {
    /**
     * Constructor with dependency injection.
     *
     * @param {Object} config
     * @param {ResidentRepository} config.residentRepository - Repository instance
     * @param {ResidentMatcher} config.residentMatcher - Matcher instance
     *
     * @throws {Error} If required dependencies are not provided
     */
    constructor({ residentRepository, residentMatcher } = {}) {
        if (!residentRepository) {
            throw new Error("ServerTrustBoundaryService requires residentRepository");
        }
        if (!residentMatcher) {
            throw new Error("ServerTrustBoundaryService requires residentMatcher");
        }

        this.residentRepository = residentRepository;
        this.residentMatcher = residentMatcher;
    }

    /**
     * Orchestrate resident matching using verified facility context.
     *
     * @param {Object} params
     * @param {Object} params.verifiedContext - Already-verified context from Server Trust Boundary
     *   - verifiedContext.facilityId: Server-confirmed facility ID
     * @param {Object} params.sourceResident - Extracted resident data from document
     *   - sourceResident.identifier: { value: "..." }
     *   - sourceResident.name: { value: "..." }
     *
     * @returns {Promise<Object>} Matching result:
     *   - status: "matched", "needs_review", "unmatched", or "error"
     *   - residentId: matched resident ID or null
     *   - matchMethod: how matching was determined
     *   - candidates: review candidates if needed
     *   - errorCode: if status is "error", identifies the failure type
     *
     * Security Boundary Enforced:
     * - Default Deny: if verifiedContext or facilityId is missing, returns unmatched
     * - No Client-Supplied facilityId Trust: uses only verifiedContext.facilityId
     * - No facilityId Override: cannot be overridden by sourceResident data
     * - Repository Errors: distinguished from no-match via error status and errorCode
     */
    async matchResident({ verifiedContext, sourceResident }) {
        // Default Deny: verify required context
        if (!verifiedContext) {
            return {
                status: "unmatched",
                residentId: null,
                matchMethod: null,
                candidates: []
            };
        }

        const verifiedFacilityId = verifiedContext.facilityId;

        if (!verifiedFacilityId) {
            return {
                status: "unmatched",
                residentId: null,
                matchMethod: null,
                candidates: []
            };
        }

        if (!sourceResident) {
            return {
                status: "unmatched",
                residentId: null,
                matchMethod: null,
                candidates: []
            };
        }

        // Extract source resident identifier
        const sourceResidentIdentifier =
            String(sourceResident?.identifier?.value || "").trim();

        if (!sourceResidentIdentifier) {
            return {
                status: "unmatched",
                residentId: null,
                matchMethod: null,
                candidates: []
            };
        }

        // Request candidates from Repository using verified facilityId
        let candidates;
        try {
            candidates = await this.residentRepository.getCandidates({
                facilityId: verifiedFacilityId,
                sourceResidentIdentifier
            });
        } catch (err) {
            // Repository threw an exception: distinguish from no-match
            // Return error status without exposing error message or stack
            return {
                status: "error",
                residentId: null,
                matchMethod: null,
                candidates: [],
                errorCode: "resident_repository_unavailable"
            };
        }

        // Validate Repository result is an array
        if (!Array.isArray(candidates)) {
            // Repository violated contract by returning non-array
            // Distinguish from no-match via error status
            return {
                status: "error",
                residentId: null,
                matchMethod: null,
                candidates: [],
                errorCode: "resident_repository_invalid_result"
            };
        }

        // Delegate matching to ResidentMatcher with verified facilityId
        const matchResult = this.residentMatcher.match({
            facilityId: verifiedFacilityId,
            sourceResident,
            candidates
        });

        return matchResult;
    }
}

module.exports = ServerTrustBoundaryService;
