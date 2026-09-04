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

    match({ facilityId, sourceResident, candidates = [] } = {}) {
        const sourceIdentifier =
            String(sourceResident?.identifier?.value || "").trim();

        const sourceName =
            String(sourceResident?.name?.value || "").trim();

        if (!facilityId || !sourceIdentifier || !Array.isArray(candidates)) {
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
            const legacyUserCodeNameMatches =
                sourceName
                    ? candidates.filter((candidate) =>
                        candidate &&
                        candidate.facilityId === null &&
                        String(candidate.userCode || "").trim() ===
                            sourceIdentifier &&
                        String(candidate.name || "").trim() === sourceName
                    )
                    : [];

            if (legacyUserCodeNameMatches.length > 0) {
                return {
                    status: "needs_review",
                    residentId: null,
                    matchMethod: "legacy_user_code_name",
                    candidates: legacyUserCodeNameMatches.map(
                        (candidate) => this.toReviewCandidate(candidate)
                    )
                };
            }

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

        const exactMatch =
            exactFacilityUserCodeMatches[0];

        const candidateName =
            String(exactMatch.name || "").trim();

        if (!sourceName) {
            return {
                status: "needs_review",
                residentId: null,
                matchMethod: "user_code_missing_source_name",
                candidates: [
                    this.toReviewCandidate(exactMatch)
                ]
            };
        }

        if (!candidateName) {
            return {
                status: "needs_review",
                residentId: null,
                matchMethod: "user_code_missing_candidate_name",
                candidates: [
                    this.toReviewCandidate(exactMatch)
                ]
            };
        }

        if (sourceName !== candidateName) {
            return {
                status: "needs_review",
                residentId: null,
                matchMethod: "user_code_name_mismatch",
                candidates: [
                    this.toReviewCandidate(exactMatch)
                ]
            };
        }

        return {
            status: "matched",
            residentId: exactMatch.id,
            matchMethod: "facility_user_code"
        };
    }
}

module.exports = ResidentMatcher;
