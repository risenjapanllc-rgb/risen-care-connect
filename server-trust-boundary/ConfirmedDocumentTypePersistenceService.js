"use strict";

class ConfirmedDocumentTypePersistenceService {
    constructor({ connectorTrustService, confirmedDocumentTypeRepository } = {}) {
        if (!connectorTrustService || typeof connectorTrustService.authenticate !== "function") {
            throw new Error("ConfirmedDocumentTypePersistenceService requires connectorTrustService");
        }
        if (!confirmedDocumentTypeRepository || typeof confirmedDocumentTypeRepository.save !== "function") {
            throw new Error("ConfirmedDocumentTypePersistenceService requires confirmedDocumentTypeRepository");
        }
        this.connectorTrustService = connectorTrustService;
        this.confirmedDocumentTypeRepository = confirmedDocumentTypeRepository;
    }

    async save({ connectorId, credential, confirmation } = {}) {
        let trustResult;
        try {
            trustResult = await this.connectorTrustService.authenticate({ connectorId, credential });
        } catch {
            return { status: "error", errorCode: "connector_trust_unavailable" };
        }

        if (!trustResult || typeof trustResult !== "object" || Array.isArray(trustResult)) {
            return { status: "error", errorCode: "connector_trust_invalid_result" };
        }
        if (trustResult.status === "denied") {
            return { status: "denied", errorCode: "connector_trust_denied" };
        }
        if (trustResult.status === "error") {
            return { status: "error", errorCode: "connector_trust_unavailable" };
        }
        if (
            trustResult.status !== "verified" ||
            !trustResult.verifiedContext ||
            typeof trustResult.verifiedContext !== "object" ||
            Array.isArray(trustResult.verifiedContext) ||
            typeof trustResult.verifiedContext.facilityId !== "string" ||
            !trustResult.verifiedContext.facilityId.trim() ||
            typeof trustResult.verifiedContext.connectorId !== "string" ||
            !trustResult.verifiedContext.connectorId.trim()
        ) {
            return { status: "error", errorCode: "connector_trust_invalid_result" };
        }

        if (
            !confirmation ||
            typeof confirmation !== "object" ||
            Array.isArray(confirmation) ||
            typeof confirmation.sourceDocumentKey !== "string" ||
            !confirmation.sourceDocumentKey.trim() ||
            typeof confirmation.documentType !== "string" ||
            !confirmation.documentType.trim() ||
            typeof confirmation.confirmedAt !== "string" ||
            !confirmation.confirmedAt.trim() ||
            Number.isNaN(Date.parse(confirmation.confirmedAt)) ||
            typeof confirmation.sourceUpdatedAt !== "string" ||
            !confirmation.sourceUpdatedAt.trim() ||
            Number.isNaN(Date.parse(confirmation.sourceUpdatedAt)) ||
            !Number.isSafeInteger(confirmation.sourceSize) ||
            confirmation.sourceSize < 0
        ) {
            return { status: "invalid", errorCode: "confirmed_document_type_invalid" };
        }

        let result;
        try {
            result = await this.confirmedDocumentTypeRepository.save({
                verifiedFacilityId: trustResult.verifiedContext.facilityId.trim(),
                verifiedConnectorId: trustResult.verifiedContext.connectorId.trim(),
                sourceDocumentKey: confirmation.sourceDocumentKey.trim(),
                documentType: confirmation.documentType.trim(),
                confirmedAt: new Date(confirmation.confirmedAt).toISOString(),
                sourceUpdatedAt: new Date(confirmation.sourceUpdatedAt).toISOString(),
                sourceSize: confirmation.sourceSize
            });
        } catch {
            return { status: "error", errorCode: "confirmed_document_type_persistence_unavailable" };
        }

        if (
            result &&
            typeof result === "object" &&
            !Array.isArray(result) &&
            ["created", "updated", "unchanged"].includes(result.status)
        ) {
            return { status: result.status };
        }

        return { status: "error", errorCode: "confirmed_document_type_persistence_invalid_result" };
    }
}

module.exports = ConfirmedDocumentTypePersistenceService;
