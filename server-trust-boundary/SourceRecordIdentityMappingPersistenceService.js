"use strict";

class SourceRecordIdentityMappingPersistenceService {
    constructor({
        connectorTrustService,
        sourceRecordIdentityMappingRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityMappingPersistenceService requires connectorTrustService"
            );
        }

        if (
            !sourceRecordIdentityMappingRepository ||
            typeof sourceRecordIdentityMappingRepository.save !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityMappingPersistenceService requires sourceRecordIdentityMappingRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;
        this.sourceRecordIdentityMappingRepository =
            sourceRecordIdentityMappingRepository;
    }

    async save({
        connectorId,
        credential,
        sourceRecordIdentityMapping
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

        if (
            !trustResult ||
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        if (trustResult.status === "denied") {
            return {
                status: "denied",
                errorCode: "connector_trust_denied"
            };
        }

        if (trustResult.status === "error") {
            return {
                status: "error",
                errorCode: "connector_trust_unavailable"
            };
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
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        const mapping =
            sourceRecordIdentityMapping;

        if (
            !mapping ||
            typeof mapping !== "object" ||
            Array.isArray(mapping) ||
            typeof mapping.sourceDocumentKey !== "string" ||
            !mapping.sourceDocumentKey.trim() ||
            typeof mapping.sourceFieldKey !== "string" ||
            !mapping.sourceFieldKey.trim() ||
            typeof mapping.confirmedAt !== "string" ||
            !mapping.confirmedAt.trim() ||
            Number.isNaN(Date.parse(mapping.confirmedAt)) ||
            typeof mapping.sourceUpdatedAt !== "string" ||
            !mapping.sourceUpdatedAt.trim() ||
            Number.isNaN(Date.parse(mapping.sourceUpdatedAt)) ||
            !Number.isSafeInteger(mapping.sourceSize) ||
            mapping.sourceSize < 0
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_record_identity_mapping_invalid"
            };
        }

        let result;

        try {
            result =
                await this.sourceRecordIdentityMappingRepository.save({
                    verifiedFacilityId:
                        trustResult.verifiedContext.facilityId.trim(),
                    verifiedConnectorId:
                        trustResult.verifiedContext.connectorId.trim(),
                    sourceDocumentKey:
                        mapping.sourceDocumentKey.trim(),
                    sourceFieldKey:
                        mapping.sourceFieldKey.trim(),
                    sheetName:
                        typeof mapping.sheetName === "string"
                            ? mapping.sheetName
                            : null,
                    headerLabel:
                        typeof mapping.headerLabel === "string"
                            ? mapping.headerLabel
                            : null,
                    confirmedAt:
                        new Date(mapping.confirmedAt).toISOString(),
                    sourceUpdatedAt:
                        new Date(mapping.sourceUpdatedAt).toISOString(),
                    sourceSize:
                        mapping.sourceSize
                });
        } catch {
            return {
                status: "error",
                errorCode:
                    "source_record_identity_mapping_persistence_unavailable"
            };
        }

        if (
            result &&
            typeof result === "object" &&
            !Array.isArray(result) &&
            ["created", "updated", "unchanged"].includes(
                result.status
            )
        ) {
            return {
                status: result.status
            };
        }

        return {
            status: "error",
            errorCode:
                "source_record_identity_mapping_persistence_invalid_result"
        };
    }
}

module.exports =
    SourceRecordIdentityMappingPersistenceService;
