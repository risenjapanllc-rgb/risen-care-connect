"use strict";

const {
    createHash
} = require("node:crypto");

class LogicalSourceSemanticPersistenceService {
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
                "LogicalSourceSemanticPersistenceService requires connectorTrustService"
            );
        }

        if (
            !repository ||
            typeof repository.save !==
                "function"
        ) {
            throw new Error(
                "LogicalSourceSemanticPersistenceService requires repository"
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
        semanticRecord
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
                status:
                    "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            trustResult?.status ===
                "denied"
        ) {
            return {
                status:
                    "denied",
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
                status:
                    "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const normalized =
            this.validateAndNormalize(
                semanticRecord
            );

        if (!normalized) {
            return {
                status:
                    "invalid",
                errorCode:
                    "logical_source_semantic_record_invalid"
            };
        }

        try {
            return await this.repository
                .save({
                    verifiedFacilityId:
                        context.facilityId.trim(),
                    verifiedConnectorId:
                        context.connectorId.trim(),
                    ...normalized
                });
        } catch {
            return {
                status:
                    "error",
                errorCode:
                    "logical_source_semantic_persistence_unavailable"
            };
        }
    }

    isValidIsoDate(value) {
        if (
            typeof value !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(
                value
            )
        ) {
            return false;
        }

        const [
            year,
            month,
            day
        ] = value
            .split("-")
            .map(Number);

        const date =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );

        return (
            date.getUTCFullYear() ===
                year &&
            date.getUTCMonth() ===
                month - 1 &&
            date.getUTCDate() ===
                day
        );
    }

    validateAndNormalize(
        semanticRecord
    ) {
        if (
            !semanticRecord ||
            typeof semanticRecord !==
                "object" ||
            Array.isArray(
                semanticRecord
            )
        ) {
            return null;
        }

        const {
            sourceId,
            sourceRecordKey,
            residentId,
            semanticType,
            logicalSlot,
            sourceRevision,
            expectedContentHash,
            contentHash,
            canonicalizationVersion,
            semanticContent
        } = semanticRecord;

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
            semanticType !==
                "resident_profile" ||
            logicalSlot !==
                "primary" ||
            typeof sourceRevision !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                sourceRevision
            ) ||
            (
                expectedContentHash !==
                    null &&
                (
                    typeof expectedContentHash !==
                        "string" ||
                    !/^[0-9a-f]{64}$/.test(
                        expectedContentHash
                    )
                )
            ) ||
            typeof contentHash !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                contentHash
            ) ||
            canonicalizationVersion !==
                "risen-resident-profile-canonicalization-1" ||
            !semanticContent ||
            typeof semanticContent !==
                "object" ||
            Array.isArray(
                semanticContent
            ) ||
            Object.keys(
                semanticContent
            ).length !== 1 ||
            !Object.prototype.hasOwnProperty.call(
                semanticContent,
                "user.birth_date"
            ) ||
            typeof semanticContent[
                "user.birth_date"
            ] !==
                "string" ||
            !this.isValidIsoDate(
                semanticContent[
                    "user.birth_date"
                ]
            )
        ) {
            return null;
        }

        const canonical = {
            "user.birth_date":
                semanticContent[
                    "user.birth_date"
                ]
        };

        const calculatedHash =
            createHash("sha256")
                .update(
                    JSON.stringify(
                        canonical
                    ),
                    "utf8"
                )
                .digest("hex");

        if (
            calculatedHash !==
                contentHash
        ) {
            return null;
        }

        return {
            sourceId:
                sourceId.trim(),
            sourceRecordKey,
            residentId:
                residentId.trim(),
            semanticType,
            logicalSlot,
            sourceRevision,
            expectedContentHash,
            contentHash,
            canonicalizationVersion,
            semanticContent:
                canonical
        };
    }
}

module.exports =
    LogicalSourceSemanticPersistenceService;
