"use strict";

class SourceResidentLinkPersistenceService {
    constructor({
        connectorTrustService,
        sourceResidentLinkPersistenceRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "SourceResidentLinkPersistenceService requires connectorTrustService"
            );
        }

        if (
            !sourceResidentLinkPersistenceRepository ||
            typeof sourceResidentLinkPersistenceRepository.save !==
                "function"
        ) {
            throw new Error(
                "SourceResidentLinkPersistenceService requires sourceResidentLinkPersistenceRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.sourceResidentLinkPersistenceRepository =
            sourceResidentLinkPersistenceRepository;
    }

    async save({
        connectorId,
        credential,
        sourceResidentLink
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
            !sourceResidentLink ||
            typeof sourceResidentLink !== "object" ||
            Array.isArray(sourceResidentLink)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_resident_link_invalid"
            };
        }

        const {
            sourceDocumentKey,
            sourceEntityKey,
            linkStatus,
            residentId,
            sourceUpdatedAt,
            sourceSize
        } = sourceResidentLink;

        const normalizedStatus =
            typeof linkStatus === "string"
                ? linkStatus.trim()
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
            typeof sourceEntityKey !== "string" ||
            !sourceEntityKey.trim() ||
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
                    "source_resident_link_invalid"
            };
        }

        let persistenceResult;

        try {
            persistenceResult =
                await this
                    .sourceResidentLinkPersistenceRepository
                    .save({
                        verifiedFacilityId:
                            verifiedContext.facilityId.trim(),
                        verifiedConnectorId:
                            verifiedContext.connectorId.trim(),
                        sourceDocumentKey:
                            sourceDocumentKey.trim(),
                        sourceEntityKey:
                            sourceEntityKey.trim(),
                        linkStatus:
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
                    "source_resident_link_persistence_unavailable"
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
                    "source_resident_link_persistence_invalid_result"
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
                "source_resident_link_persistence_invalid_result"
        };
    }
}

module.exports =
    SourceResidentLinkPersistenceService;
