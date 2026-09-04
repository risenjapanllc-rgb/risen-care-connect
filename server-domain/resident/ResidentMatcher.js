"use strict";

/**
 * RISEN CARE Server-side Domain Logic
 *
 * ResidentMatcher is intended to run behind the
 * RISEN CARE Server Trust Boundary.
 *
 * It must not:
 * - trust facilityId asserted by Local Connector
 * - access local Word / Excel files
 * - contain Supabase credentials
 * - act as an HTTP authentication boundary
 *
 * facilityId must already be verified by the
 * Server Trust Boundary before matching begins.
 */
class ResidentMatcher {
    constructor() {
        // Repository integration will be added incrementally.
    }

    toReviewCandidate(candidate) {
        return {
            id: candidate.id,
            name: candidate.name || null,
            gender: candidate.gender || null,
            affiliation: candidate.affiliation || null
        };
    }

    match({ facilityId, sourceResident, candidates = [] }) {
        const sourceIdentifier =
            String(sourceResident?.identifier?.value || "").trim();

        if (!facilityId || !sourceIdentifier) {
            return {
                status: "unmatched",
                residentId: null,
                matchMethod: null,
                candidates: []
            };
        }

        const exactFacilityUserCodeMatches =
            candidates.filter((candidate) =>
                candidate &&
                candidate.facilityId === facilityId &&
                String(candidate.userCode || "").trim() === sourceIdentifier
            );

        if (exactFacilityUserCodeMatches.length === 0) {
            return {
                status: "unmatched",
                residentId: null,
                matchMethod: null,
                candidates: []
            };
        }

        if (exactFacilityUserCodeMatches.length > 1) {
            return {
                status: "needs_review",
                residentId: null,
                matchMethod: "duplicate_facility_user_code",
                candidates: exactFacilityUserCodeMatches.map(
                    (candidate) => this.toReviewCandidate(candidate)
                )
            };
        }

        return {
            status: "matched",
            residentId: exactFacilityUserCodeMatches[0].id,
            matchMethod: "facility_user_code"
        };
    }
}

module.exports = ResidentMatcher;
