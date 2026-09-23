"use strict";

class ConnectorResidentAdmissionService {
    constructor({
        connectorTrustService,
        repository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error("ConnectorResidentAdmissionService requires connectorTrustService");
        }

        if (!repository || typeof repository.admit !== "function") {
            throw new Error("ConnectorResidentAdmissionService requires repository");
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = repository;
    }

    async admit({
        connectorId,
        credential,
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        name,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        let trustResult;

        try {
            trustResult = await this.connectorTrustService.authenticate({
                connectorId,
                credential
            });
        } catch {
            return {
                status: "error",
                errorCode: "connector_trust_unavailable"
            };
        }

        if (trustResult?.status === "denied") {
            return {
                status: "denied",
                errorCode: "connector_trust_denied"
            };
        }

        const context = trustResult?.verifiedContext;

        if (
            trustResult?.status !== "verified" ||
            typeof context?.facilityId !== "string" ||
            !context.facilityId.trim() ||
            typeof context?.connectorId !== "string" ||
            !context.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        if (!this.isValid({
            sourceDocumentKey,
            identifierType,
            identifierDigest,
            name,
            sourceUpdatedAt,
            sourceSize
        })) {
            return {
                status: "invalid",
                errorCode: "resident_admission_invalid"
            };
        }

        try {
            return await this.repository.admit({
                verifiedFacilityId: context.facilityId.trim(),
                verifiedConnectorId: context.connectorId.trim(),
                sourceDocumentKey: sourceDocumentKey.trim(),
                identifierType: identifierType.trim(),
                identifierDigest: identifierDigest.trim(),
                name: name.trim(),
                sourceUpdatedAt,
                sourceSize
            });
        } catch {
            return {
                status: "error",
                errorCode: "resident_admission_unavailable"
            };
        }
    }

    isValid(input) {
        if (
            typeof input.sourceDocumentKey !== "string" ||
            !input.sourceDocumentKey.trim() ||
            !["name", "user_code"].includes(input.identifierType) ||
            typeof input.identifierDigest !== "string" ||
            !/^[0-9a-f]{64}$/.test(input.identifierDigest) ||
            typeof input.name !== "string" ||
            !input.name.trim() ||
            typeof input.sourceUpdatedAt !== "string" ||
            Number.isNaN(Date.parse(input.sourceUpdatedAt)) ||
            !Number.isSafeInteger(input.sourceSize) ||
            input.sourceSize < 0
        ) {
            return false;
        }

        return true;
    }
}

module.exports = ConnectorResidentAdmissionService;
