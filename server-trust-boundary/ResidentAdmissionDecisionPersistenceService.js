"use strict";

const VALID_DECISIONS = new Set([
    "approved_new",
    "rejected",
    "deferred"
]);

class ResidentAdmissionDecisionPersistenceService {
    constructor({
        connectorTrustService,
        residentAdmissionDecisionRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function" ||
            !residentAdmissionDecisionRepository ||
            typeof residentAdmissionDecisionRepository.save !== "function"
        ) {
            throw new Error(
                "ResidentAdmissionDecisionPersistenceService requires dependencies"
            );
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = residentAdmissionDecisionRepository;
    }

    async save({ connectorId, credential, decision } = {}) {
        let trust;
        try {
            trust = await this.connectorTrustService.authenticate({
                connectorId,
                credential
            });
        } catch {
            return {
                status: "error",
                errorCode: "connector_trust_unavailable"
            };
        }

        if (trust?.status === "denied") {
            return {
                status: "denied",
                errorCode: "connector_trust_denied"
            };
        }

        const context = trust?.verifiedContext;

        if (
            trust?.status !== "verified" ||
            !context ||
            typeof context.facilityId !== "string" ||
            !context.facilityId.trim() ||
            typeof context.connectorId !== "string" ||
            !context.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        if (
            !decision ||
            typeof decision !== "object" ||
            Array.isArray(decision) ||
            typeof decision.sourceDocumentKey !== "string" ||
            !decision.sourceDocumentKey.trim() ||
            typeof decision.sourceEntityKey !== "string" ||
            !decision.sourceEntityKey.trim() ||
            !VALID_DECISIONS.has(decision.decision) ||
            typeof decision.reviewedAt !== "string" ||
            Number.isNaN(Date.parse(decision.reviewedAt)) ||
            typeof decision.sourceUpdatedAt !== "string" ||
            Number.isNaN(Date.parse(decision.sourceUpdatedAt)) ||
            !Number.isSafeInteger(decision.sourceSize) ||
            decision.sourceSize < 0
        ) {
            return {
                status: "invalid",
                errorCode: "resident_admission_decision_invalid"
            };
        }

        try {
            return await this.repository.save({
                verifiedFacilityId: context.facilityId.trim(),
                verifiedConnectorId: context.connectorId.trim(),
                sourceDocumentKey: decision.sourceDocumentKey.trim(),
                sourceEntityKey: decision.sourceEntityKey.trim(),
                decision: decision.decision,
                reviewedAt: new Date(decision.reviewedAt).toISOString(),
                sourceUpdatedAt:
                    new Date(decision.sourceUpdatedAt).toISOString(),
                sourceSize: decision.sourceSize
            });
        } catch {
            return {
                status: "error",
                errorCode: "resident_admission_persistence_unavailable"
            };
        }
    }
}

module.exports = ResidentAdmissionDecisionPersistenceService;
