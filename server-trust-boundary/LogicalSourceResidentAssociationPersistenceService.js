"use strict";

class LogicalSourceResidentAssociationPersistenceService {
    constructor({
        connectorTrustService,
        repository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceResidentAssociationPersistenceService requires connectorTrustService"
            );
        }

        if (
            !repository ||
            typeof repository.save !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceResidentAssociationPersistenceService requires repository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.repository =
            repository;
    }

    async persist({
        connectorId,
        credential,
        association
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService
                    .authenticate({
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
            trustResult?.status ===
                "denied"
        ) {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        const context =
            trustResult?.verifiedContext;

        if (
            trustResult?.status !==
                "verified" ||
            typeof context?.facilityId !==
                "string" ||
            !context.facilityId.trim() ||
            typeof context?.connectorId !==
                "string" ||
            !context.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            !association ||
            typeof association !==
                "object" ||
            Array.isArray(association)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "logical_source_resident_association_invalid"
            };
        }

        const {
            sourceId,
            sourceRecordKey,
            residentId,
            matchMethod,
            sourceRevision
        } = association;

        if (
            typeof sourceId !==
                "string" ||
            !sourceId.trim() ||
            typeof sourceRecordKey !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                sourceRecordKey
            ) ||
            typeof residentId !==
                "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                residentId.trim()
            ) ||
            matchMethod !==
                "user_code_name_verified" ||
            typeof sourceRevision !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                sourceRevision
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "logical_source_resident_association_invalid"
            };
        }

        try {
            return await this.repository
                .save({
                    verifiedFacilityId:
                        context
                            .facilityId
                            .trim(),
                    verifiedConnectorId:
                        context
                            .connectorId
                            .trim(),
                    sourceId:
                        sourceId.trim(),
                    sourceRecordKey,
                    residentId:
                        residentId.trim(),
                    matchMethod,
                    sourceRevision
                });
        } catch {
            return {
                status: "error",
                errorCode:
                    "logical_source_resident_association_persistence_unavailable"
            };
        }
    }
}

module.exports =
    LogicalSourceResidentAssociationPersistenceService;
