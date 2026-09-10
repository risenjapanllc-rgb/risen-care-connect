"use strict";

class SemanticPersistenceService {
    constructor({
        semanticRecordPersistenceRepository
    } = {}) {
        if (
            !semanticRecordPersistenceRepository ||
            typeof semanticRecordPersistenceRepository
                .createConfirmedRecord !== "function" ||
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
            return this.rejected("persistence_decision_invalid");
        }

        if (
            persistenceDecision.decision.status !==
            "confirmed_candidate"
        ) {
            return {
                status: "not_required"
            };
        }

        if (
            !this.isPlainObject(verifiedContext) ||
            !this.isNonEmptyString(
                verifiedContext.facilityId
            ) ||
            !this.isNonEmptyString(
                verifiedContext.connectorId
            ) ||
            !this.isPlainObject(semanticPipeline)
        ) {
            return this.rejected("trusted_context_invalid");
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
            return this.rejected("processed_semantic_record_invalid");
        }

        const recordCreation =
            persistenceDecision.recordCreation;

        const recordChange =
            persistenceDecision.recordChange;

        if (
            this.isPlainObject(recordCreation) &&
            recordChange === undefined
        ) {
            if (
                semanticPipeline.status !==
                    "new_candidate"
            ) {
                return this.rejected(
                    "create_contract_invalid:pipeline_status"
                );
            }

            if (
                !this.isPlainObject(
                    semanticPipeline
                        .identityResolution
                ) ||
                semanticPipeline
                    .identityResolution
                    .status !==
                    "new_candidate"
            ) {
                return this.rejected(
                    "create_contract_invalid:identity_resolution"
                );
            }

            if (
                recordCreation.status !==
                    "create_candidate"
            ) {
                return this.rejected(
                    "create_contract_invalid:creation_status"
                );
            }

            if (
                !this.isNonEmptyString(
                    recordCreation.residentId
                )
            ) {
                return this.rejected(
                    "create_contract_invalid:resident_id"
                );
            }

            if (
                !this.isNonEmptyString(
                    recordCreation
                        .sourceDocumentKey
                )
            ) {
                return this.rejected(
                    "create_contract_invalid:source_document_key"
                );
            }

            if (
                !this.isNonEmptyString(
                    recordCreation
                        .sourceRecordKey
                )
            ) {
                return this.rejected(
                    "create_contract_invalid:source_record_key"
                );
            }

            let result;

            try {
                result =
                    await this
                        .semanticRecordPersistenceRepository
                        .createConfirmedRecord({
                            verifiedFacilityId:
                                verifiedContext.facilityId,
                            verifiedConnectorId:
                                verifiedContext.connectorId,
                            residentId:
                                recordCreation.residentId,
                            sourceDocumentKey:
                                recordCreation
                                    .sourceDocumentKey,
                            sourceRecordKey:
                                recordCreation
                                    .sourceRecordKey,
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
                return this.rejected("create_repository_exception");
            }

            if (
                !this.isPlainObject(result) ||
                typeof result.status !==
                    "string"
            ) {
                return this.rejected("create_repository_result_invalid");
            }

            if (
                result.status === "created" ||
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

            const rejectedResult = this.rejected();

            if (
                result.status === "denied" ||
                result.status === "resident_mismatch"
            ) {
                Object.defineProperty(
                    rejectedResult,
                    "diagnosticCode",
                    {
                        value: "create_rpc:" + result.status,
                        enumerable: false
                    }
                );
            }

            return rejectedResult;
        }

        if (
            recordCreation !== undefined ||
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
            "updated_candidate" ||
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

    rejected(diagnosticCode) {
        const result = {
            status: "rejected"
        };

        if (
            typeof diagnosticCode === "string" &&
            diagnosticCode.trim()
        ) {
            Object.defineProperty(
                result,
                "diagnosticCode",
                {
                    value: diagnosticCode.trim(),
                    enumerable: false
                }
            );
        }

        return result;
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
