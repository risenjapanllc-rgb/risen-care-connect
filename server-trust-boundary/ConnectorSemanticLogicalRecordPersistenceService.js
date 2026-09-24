"use strict";

const RecipientCertificateSemanticIntegrityVerifier =
    require("./RecipientCertificateSemanticIntegrityVerifier");

class ConnectorSemanticLogicalRecordPersistenceService {
    constructor({
        connectorTrustService,
        repository,
        integrityVerifier = new RecipientCertificateSemanticIntegrityVerifier()
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error("ConnectorSemanticLogicalRecordPersistenceService requires connectorTrustService");
        }

        if (!repository || typeof repository.persist !== "function") {
            throw new Error("ConnectorSemanticLogicalRecordPersistenceService requires repository");
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = repository;
        this.integrityVerifier = integrityVerifier;
    }

    async persist({
        connectorId,
        credential,
        residentId,
        semanticType,
        logicalSlot,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        expectedContentHash,
        contentHash,
        canonicalizationVersion,
        semanticContent
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
            semanticType !== "recipient_certificate" ||
            logicalSlot !== "primary" ||
            typeof residentId !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                residentId.trim()
            ) ||
            !residentId.trim() ||
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            typeof contentHash !== "string" ||
            !/^[0-9a-f]{64}$/.test(contentHash) ||
            (
                expectedContentHash !== null &&
                (
                    typeof expectedContentHash !== "string" ||
                    !/^[0-9a-f]{64}$/.test(expectedContentHash)
                )
            ) ||
            ![
                "risen-recipient-certificate-canonicalization-1",
                "risen-recipient-certificate-canonicalization-2"
            ].includes(canonicalizationVersion) ||
            !semanticContent ||
            typeof semanticContent !== "object" ||
            Array.isArray(semanticContent)
        ) {
            return {
                status: "invalid",
                errorCode: "semantic_logical_record_persistence_invalid"
            };
        }

        if (
            !this.integrityVerifier ||
            typeof this.integrityVerifier.verify !== "function" ||
            !this.integrityVerifier.verify({
                semanticContent,
                contentHash,
                canonicalizationVersion
            })
        ) {
            return {
                status: "invalid",
                errorCode:
                    "semantic_logical_record_persistence_invalid"
            };
        }

        try {
            return await this.repository.persist({
                verifiedFacilityId: context.facilityId.trim(),
                verifiedConnectorId: context.connectorId.trim(),
                residentId: residentId.trim(),
                semanticType,
                logicalSlot,
                sourceDocumentKey: sourceDocumentKey.trim(),
                sourceUpdatedAt,
                sourceSize,
                expectedContentHash,
                contentHash,
                canonicalizationVersion,
                semanticContent
            });
        } catch {
            return {
                status: "error",
                errorCode: "semantic_logical_record_persistence_unavailable"
            };
        }
    }
}

module.exports =
    ConnectorSemanticLogicalRecordPersistenceService;
