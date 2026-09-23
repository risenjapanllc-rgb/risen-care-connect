"use strict";

const VALID_DECISIONS = Object.freeze([
    "approved_new",
    "rejected",
    "deferred"
]);

function validateResidentAdmissionDecision(input = {}) {
    const decision =
        typeof input.decision === "string"
            ? input.decision.trim()
            : "";

    if (!VALID_DECISIONS.includes(decision)) {
        throw new TypeError("invalid resident admission decision");
    }

    const sourceDocumentKey =
        typeof input.sourceDocumentKey === "string"
            ? input.sourceDocumentKey.trim()
            : "";

    const sourceEntityKey =
        typeof input.sourceEntityKey === "string"
            ? input.sourceEntityKey.trim()
            : "";

    const sourceUpdatedAt =
        typeof input.sourceUpdatedAt === "string"
            ? input.sourceUpdatedAt.trim()
            : "";

    const sourceSize = input.sourceSize;

    if (
        !sourceDocumentKey ||
        !sourceEntityKey ||
        !sourceUpdatedAt ||
        Number.isNaN(Date.parse(sourceUpdatedAt)) ||
        !Number.isSafeInteger(sourceSize) ||
        sourceSize < 0
    ) {
        throw new TypeError("invalid resident admission snapshot");
    }

    return {
        sourceDocumentKey,
        sourceEntityKey,
        sourceUpdatedAt:
            new Date(sourceUpdatedAt).toISOString(),
        sourceSize,
        decision,
        reviewedByHuman: true
    };
}

module.exports = {
    VALID_DECISIONS,
    validateResidentAdmissionDecision
};
