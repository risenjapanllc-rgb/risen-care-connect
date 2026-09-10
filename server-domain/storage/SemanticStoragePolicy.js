"use strict";

class SemanticStoragePolicy {
    evaluate(input) {
        if (!this.isPlainObject(input)) {
            return this.rejected();
        }

        const residentMatching =
            input.residentMatching;
        const semanticPipeline =
            input.semanticPipeline;

        if (
            !this.isPlainObject(residentMatching) ||
            !this.isPlainObject(semanticPipeline)
        ) {
            return this.rejected();
        }

        const residentStatus =
            residentMatching.status;
        const semanticStatus =
            semanticPipeline.status;

        if (
            ![
                "matched",
                "needs_review",
                "unmatched"
            ].includes(residentStatus)
        ) {
            return this.rejected();
        }

        if (
            ![
                "resolved",
                "new_candidate",
                "pending_review",
                "conflict",
                "invalid"
            ].includes(semanticStatus)
        ) {
            return this.rejected();
        }

        if (
            semanticStatus === "invalid"
        ) {
            return this.rejected();
        }

        if (
            residentStatus === "matched" &&
            !this.isNonEmptyString(
                residentMatching.residentId
            )
        ) {
            return this.rejected();
        }

        if (
            residentStatus === "needs_review" ||
            residentStatus === "unmatched"
        ) {
            return {
                status: "pending_review"
            };
        }

        if (
            semanticStatus === "conflict"
        ) {
            return {
                status: "conflict"
            };
        }

        if (
            semanticStatus === "pending_review"
        ) {
            return {
                status: "pending_review"
            };
        }

        if (
            semanticStatus === "new_candidate"
        ) {
            const identityResolution =
                semanticPipeline
                    .identityResolution;

            if (
                !this.isPlainObject(
                    identityResolution
                ) ||
                identityResolution.status !==
                    "new_candidate"
            ) {
                return this.rejected();
            }

            return {
                status:
                    "confirmed_candidate"
            };
        }

        if (
            semanticStatus === "resolved"
        ) {
            const identityResolution =
                semanticPipeline
                    .identityResolution;

            if (
                !this.isPlainObject(
                    identityResolution
                ) ||
                identityResolution.status !==
                    "resolved" ||
                !this.isNonEmptyString(
                    identityResolution.recordId
                )
            ) {
                return this.rejected();
            }

            return {
                status:
                    "confirmed_candidate"
            };
        }

        return this.rejected();
    }

    rejected() {
        return {
            status: "rejected"
        };
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isPlainObject(value) {
        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );
    }
}

module.exports =
    SemanticStoragePolicy;
