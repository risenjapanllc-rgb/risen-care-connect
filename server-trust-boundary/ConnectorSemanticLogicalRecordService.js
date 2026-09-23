"use strict";

class ConnectorSemanticLogicalRecordService {
    constructor({
        connectorTrustService,
        repository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error("ConnectorSemanticLogicalRecordService requires connectorTrustService");
        }

        if (!repository || typeof repository.get !== "function") {
            throw new Error("ConnectorSemanticLogicalRecordService requires repository");
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = repository;
    }

    async lookup({
        connectorId,
        credential,
        residentId,
        semanticType,
        logicalSlot
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService.authenticate({
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

        if (
            [residentId, semanticType, logicalSlot].some(
                value =>
                    typeof value !== "string" ||
                    !value.trim()
            )
        ) {
            return {
                status: "invalid",
                errorCode: "semantic_logical_record_invalid"
            };
        }

        try {
            const record =
                await this.repository.get({
                    facilityId: context.facilityId.trim(),
                    connectorId: context.connectorId.trim(),
                    residentId: residentId.trim(),
                    semanticType: semanticType.trim(),
                    logicalSlot: logicalSlot.trim()
                });

            return record
                ? { status: "found", record }
                : { status: "not_found", record: null };
        } catch {
            return {
                status: "error",
                errorCode: "semantic_logical_record_unavailable"
            };
        }
    }
}

module.exports =
    ConnectorSemanticLogicalRecordService;
