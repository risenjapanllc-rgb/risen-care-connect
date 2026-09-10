"use strict";

class SemanticPersistenceService {
    constructor({
        semanticRecordPersistenceRepository
    } = {}) {
        if (
            !semanticRecordPersistenceRepository ||
            typeof semanticRecordPersistenceRepository
                .updateConfirmedRecord !== "function"
        ) {
            throw new Error(
                "SemanticPersistenceService requires semanticRecordPersistenceRepository"
            );
        }

        this.semanticRecordPersistenceRepository =
            semanticRecordPersistenceRepository;
    }

    async persist({
        verifiedContext,
        semanticPipeline,
        persistenceDecision
    } = {}) {
        if (
            !this.isPlainObject(
                persistenceDecision
            ) ||
            !this.isPlainObject(
                persistenceDecision.decision
            )
        ) {
            return this.rejected();
        }

        if (
            persistenceDecision.decision.status !==
            "confirmed_candidate"
        ) {
            return {
                status: "not_required"
            };
        }

        const recordChange =
            persistenceDecision.recordChange;

        if (
            !this.isPlainObject(recordChange)
        ) {
            return this.rejected();
        }

        if (
            recordChange.status ===
            "unchanged_candidate"
        ) {
            return {
                status: "unchanged"
            };
        }

        if (
            recordChange.status !==
            "updated_candidate"
        ) {
            return this.rejected();
        }

        if (
            !this.isPlainObject(verifiedContext) ||
            !this.isNonEmptyString(
                verifiedContext.facilityId
            ) ||
            !this.isNonEmptyString(
                verifiedContext.connectorId
            ) ||
            !this.isPlainObject(semanticPipeline) ||
            semanticPipeline.status !==
                "resolved" ||
            !this.isPlainObject(
                semanticPipeline.identityResolution
            ) ||
            semanticPipeline.identityResolution.status !==
                "resolved" ||
            !this.isNonEmptyString(
                semanticPipeline
                    .identityResolution
                    .recordId
            ) ||
            !this.isNonEmptyString(
                recordChange.recordId
            ) ||
            recordChange.recordId !==
                semanticPipeline
                    .identityResolution
                    .recordId ||
            !this.isContentHash(
                recordChange.expectedContentHash
            )
        ) {
            return this.rejected();
        }

        const processedSemanticRecord =
            semanticPipeline
                .processedSemanticRecord;

        if (
            !this.isPlainObject(
                processedSemanticRecord
            ) ||
            !this.isContentHash(
                processedSemanticRecord
                    .contentHash
            ) ||
            !this.isPlainObject(
                processedSemanticRecord
                    .processingMetadata
            ) ||
            !this.isNonEmptyString(
                processedSemanticRecord
                    .processingMetadata
                    .canonicalizationVersion
            ) ||
            !this.isPlainObject(
                processedSemanticRecord
                    .semanticContent
            ) ||
            !this.isNonEmptyString(
                processedSemanticRecord
                    .semanticContent
                    .semanticType
            )
        ) {
            return this.rejected();
        }

        let result;

        try {
            result =
                await this
                    .semanticRecordPersistenceRepository
                    .updateConfirmedRecord({
                        verifiedFacilityId:
                            verifiedContext.facilityId,
                        verifiedConnectorId:
                            verifiedContext.connectorId,
                        recordId:
                            recordChange.recordId,
                        expectedContentHash:
                            recordChange
                                .expectedContentHash,
                        contentHash:
                            processedSemanticRecord
                                .contentHash,
                        canonicalizationVersion:
                            processedSemanticRecord
                                .processingMetadata
                                .canonicalizationVersion,
                        semanticContent:
                            processedSemanticRecord
                                .semanticContent
                    });
        } catch {
            return this.rejected();
        }

        if (
            !this.isPlainObject(result) ||
            typeof result.status !== "string"
        ) {
            return this.rejected();
        }

        if (
            result.status === "updated" ||
            result.status === "unchanged"
        ) {
            return {
                status: result.status
            };
        }

        if (
            result.status === "conflict"
        ) {
            return {
                status: "conflict"
            };
        }

        return this.rejected();
    }

    rejected() {
        return {
            status: "rejected"
        };
    }

    isContentHash(value) {
        return (
            typeof value === "string" &&
            /^[0-9a-f]{64}$/.test(value)
        );
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isPlainObject(value) {
        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return false;
        }

        const prototype =
            Object.getPrototypeOf(value);

        return (
            prototype === Object.prototype ||
            prototype === null
        );
    }
}

module.exports =
    SemanticPersistenceService;
