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
        // Matching logic will be added incrementally.
    }
}

module.exports = ResidentMatcher;
