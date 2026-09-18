"use strict";

class SourceResidentMappingPersistenceService {
    constructor({
        connectorTrustService,
        sourceResidentMappingPersistenceRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "SourceResidentMappingPersistenceService requires connectorTrustService"
            );
        }

        if (
            !sourceResidentMappingPersistenceRepository ||
            typeof sourceResidentMappingPersistenceRepository.save !==
                "function"
        ) {
            throw new Error(
                "SourceResidentMappingPersistenceService requires sourceResidentMappingPersistenceRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.sourceResidentMappingPersistenceRepository =
            sourceResidentMappingPersistenceRepository;
    }

    async save({
        connectorId,
        credential,
        sourceResidentMapping
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

        if (trustResult.status === "error") {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (trustResult.status !== "verified") {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const verifiedContext =
            trustResult.verifiedContext;

        if (
            !verifiedContext ||
            typeof verifiedContext !== "object" ||
            Array.isArray(verifiedContext) ||
            typeof verifiedContext.facilityId !==
                "string" ||
            !verifiedContext.facilityId.trim() ||
            typeof verifiedContext.connectorId !==
                "string" ||
            !verifiedContext.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            !sourceResidentMapping ||
            typeof sourceResidentMapping !== "object" ||
            Array.isArray(sourceResidentMapping)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_resident_mapping_invalid"
            };
        }

        const {
            sourceDocumentKey,
            identifierType,
            identifierDigest,
            mappingStatus,
            residentId,
            sourceUpdatedAt,
            sourceSize
        } = sourceResidentMapping;

        const normalizedStatus =
            typeof mappingStatus === "string"
                ? mappingStatus.trim()
                : "";

        const normalizedIdentifierType =
            typeof identifierType === "string"
                ? identifierType.trim()
                : "";

        const normalizedIdentifierDigest =
            typeof identifierDigest === "string"
                ? identifierDigest.trim()
                : "";

        const validStatuses =
            new Set([
                "confirmed",
                "deferred",
                "no_match"
            ]);

        const normalizedResidentId =
            typeof residentId === "string"
                ? residentId.trim()
                : residentId;

        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            !["user_code", "name"].includes(
                normalizedIdentifierType
            ) ||
            !/^[0-9a-f]{64}$/.test(
                normalizedIdentifierDigest
            ) ||
            !validStatuses.has(normalizedStatus) ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            (
                normalizedStatus === "confirmed" &&
                (
                    typeof normalizedResidentId !==
                        "string" ||
                    !normalizedResidentId
                )
            ) ||
            (
                normalizedStatus !== "confirmed" &&
                normalizedResidentId != null
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_resident_mapping_invalid"
            };
        }

        let persistenceResult;

        try {
            persistenceResult =
                await this
                    .sourceResidentMappingPersistenceRepository
                    .save({
                        verifiedFacilityId:
                            verifiedContext.facilityId.trim(),
                        verifiedConnectorId:
                            verifiedContext.connectorId.trim(),
                        sourceDocumentKey:
                            sourceDocumentKey.trim(),
                        identifierType:
                            normalizedIdentifierType,
                        identifierDigest:
                            normalizedIdentifierDigest,
                        mappingStatus:
                            normalizedStatus,
                        residentId:
                            normalizedStatus === "confirmed"
                                ? normalizedResidentId
                                : null,
                        sourceUpdatedAt:
                            new Date(sourceUpdatedAt)
                                .toISOString(),
                        sourceSize
                    });
        } catch {
            return {
                status: "error",
                errorCode:
                    "source_resident_mapping_persistence_unavailable"
            };
        }

        if (
            !persistenceResult ||
            typeof persistenceResult !== "object" ||
            Array.isArray(persistenceResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "source_resident_mapping_persistence_invalid_result"
            };
        }

        if (
            [
                "created",
                "updated",
                "unchanged"
            ].includes(persistenceResult.status)
        ) {
            return {
                status:
                    persistenceResult.status
            };
        }

        return {
            status: "error",
            errorCode:
                "source_resident_mapping_persistence_invalid_result"
        };
    }
}

module.exports =
    SourceResidentMappingPersistenceService;
