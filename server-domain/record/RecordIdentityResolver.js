"use strict";

class RecordIdentityResolver {
    constructor({ recordIdentityCandidateProvider } = {}) {
        this.recordIdentityCandidateProvider = recordIdentityCandidateProvider;
    }

    async resolve(identityContext) {
        if (!this.isPlainObject(identityContext)) {
            return this.invalid("record_identity_context_invalid");
        }

        const lookupScope = this.createLookupScope(identityContext);
        if (!lookupScope) {
            return { status: "pending_review" };
        }

        let candidates;
        try {
            candidates = await this.recordIdentityCandidateProvider.findCandidates(
                lookupScope
            );
        } catch {
            return this.invalid("record_identity_lookup_failed");
        }

        if (!Array.isArray(candidates)) {
            return this.invalid("record_identity_candidates_invalid");
        }

        if (candidates.length === 0) {
            return { status: "new_candidate" };
        }

        if (candidates.length !== 1) {
            return { status: "conflict" };
        }

        const candidate = candidates[0];
        if (!this.isPlainObject(candidate) || !this.isNonEmptyString(candidate.recordId)) {
            return this.invalid("record_identity_candidates_invalid");
        }

        return {
            status: "resolved",
            recordId: candidate.recordId
        };
    }

    createLookupScope(identityContext) {
        const keys = [
            "verifiedFacilityId",
            "verifiedConnectorId",
            "sourceDocumentKey",
            "sourceRecordKey"
        ];
        const lookupScope = {};

        for (const key of keys) {
            const value = identityContext[key];
            if (!this.isNonEmptyString(value)) {
                return null;
            }
            lookupScope[key] = value;
        }

        return lookupScope;
    }

    isNonEmptyString(value) {
        return typeof value === "string" && value.trim() !== "";
    }

    isPlainObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    invalid(errorCode) {
        return {
            status: "invalid",
            errorCode
        };
    }
}

module.exports = RecordIdentityResolver;