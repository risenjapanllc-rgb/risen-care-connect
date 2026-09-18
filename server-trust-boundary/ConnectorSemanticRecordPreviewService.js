"use strict";

class ConnectorSemanticRecordPreviewService {
    constructor({
        connectorTrustService,
        semanticRecordPreviewRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewService requires connectorTrustService"
            );
        }

        if (
            !semanticRecordPreviewRepository ||
            typeof semanticRecordPreviewRepository
                .getBySourceRecordKeys !== "function"
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewService requires semanticRecordPreviewRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;
        this.semanticRecordPreviewRepository =
            semanticRecordPreviewRepository;
    }

    async lookup({
        connectorId,
        credential,
        sourceDocumentKey,
        sourceRecordKeys
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
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            !trustResult ||
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (trustResult.status === "denied") {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status !== "verified" ||
            !trustResult.verifiedContext ||
            typeof trustResult.verifiedContext !== "object" ||
            Array.isArray(
                trustResult.verifiedContext
            ) ||
            typeof trustResult.verifiedContext.facilityId !==
                "string" ||
            !trustResult.verifiedContext.facilityId.trim() ||
            typeof trustResult.verifiedContext.connectorId !==
                "string" ||
            !trustResult.verifiedContext.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            !Array.isArray(sourceRecordKeys) ||
            sourceRecordKeys.length < 1 ||
            sourceRecordKeys.length > 500
        ) {
            return {
                status: "invalid",
                errorCode:
                    "semantic_record_preview_invalid"
            };
        }

        const normalizedKeys =
            sourceRecordKeys.map(value =>
                typeof value === "string"
                    ? value.trim()
                    : ""
            );

        if (
            normalizedKeys.some(value => !value) ||
            new Set(normalizedKeys).size !==
                normalizedKeys.length
        ) {
            return {
                status: "invalid",
                errorCode:
                    "semantic_record_preview_invalid"
            };
        }

        try {
            const records =
                await this.semanticRecordPreviewRepository
                    .getBySourceRecordKeys({
                        facilityId:
                            trustResult.verifiedContext
                                .facilityId.trim(),
                        connectorId:
                            trustResult.verifiedContext
                                .connectorId.trim(),
                        sourceDocumentKey:
                            sourceDocumentKey.trim(),
                        sourceRecordKeys:
                            normalizedKeys
                    });

            return {
                status: "found",
                records
            };
        } catch {
            return {
                status: "error",
                errorCode:
                    "semantic_record_preview_unavailable"
            };
        }
    }
}

module.exports =
    ConnectorSemanticRecordPreviewService;
