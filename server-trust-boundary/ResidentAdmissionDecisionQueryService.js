"use strict";

class ResidentAdmissionDecisionQueryService {
    constructor({
        connectorTrustService,
        residentAdmissionDecisionRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function" ||
            !residentAdmissionDecisionRepository ||
            typeof residentAdmissionDecisionRepository.list !== "function"
        ) {
            throw new Error(
                "ResidentAdmissionDecisionQueryService requires dependencies"
            );
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = residentAdmissionDecisionRepository;
    }

    async list({
        connectorId,
        credential,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
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
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return {
                status: "invalid",
                errorCode: "resident_admission_query_invalid"
            };
        }

        try {
            const decisions = await this.repository.list({
                verifiedFacilityId: context.facilityId.trim(),
                verifiedConnectorId: context.connectorId.trim(),
                sourceDocumentKey: sourceDocumentKey.trim(),
                sourceUpdatedAt:
                    new Date(sourceUpdatedAt).toISOString(),
                sourceSize
            });

            return { status: "found", decisions };
        } catch {
            return {
                status: "error",
                errorCode: "resident_admission_query_unavailable"
            };
        }
    }
}

module.exports = ResidentAdmissionDecisionQueryService;
