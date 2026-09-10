"use strict";

class SemanticStorageDecisionService {
    constructor({
        existingSemanticRecordRepository,
        recordChangeResolver,
        semanticStoragePolicy
    } = {}) {
        if (
            !existingSemanticRecordRepository ||
            typeof existingSemanticRecordRepository
                .getByRecordId !== "function"
        ) {
            throw new Error(
                "SemanticStorageDecisionService requires existingSemanticRecordRepository"
            );
        }

        if (
            !recordChangeResolver ||
            typeof recordChangeResolver.resolve !==
                "function"
        ) {
            throw new Error(
                "SemanticStorageDecisionService requires recordChangeResolver"
            );
        }

        if (
            !semanticStoragePolicy ||
            typeof semanticStoragePolicy.evaluate !==
                "function"
        ) {
            throw new Error(
                "SemanticStorageDecisionService requires semanticStoragePolicy"
            );
        }

        this.existingSemanticRecordRepository =
            existingSemanticRecordRepository;

        this.recordChangeResolver =
            recordChangeResolver;

        this.semanticStoragePolicy =
            semanticStoragePolicy;
    }

    async decide(input = {}) {
        const persistenceDecision =
            await this.decideForPersistence(
                input
            );

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

        return persistenceDecision.decision;
    }

    async decideForPersistence({
        verifiedContext,
        residentMatching,
        semanticPipeline
    } = {}) {
        if (
            !this.isPlainObject(semanticPipeline)
        ) {
            return {
                decision: this.rejected()
            };
        }

        let recordChange;

        if (
            semanticPipeline.status ===
            "resolved"
        ) {
            const processedSemanticRecord =
                semanticPipeline
                    .processedSemanticRecord;

            const identityResolution =
                semanticPipeline
                    .identityResolution;

            if (
                !this.isPlainObject(
                    verifiedContext
                ) ||
                !this.isNonEmptyString(
                    verifiedContext.facilityId
                ) ||
                !this.isPlainObject(
                    identityResolution
                ) ||
                identityResolution.status !==
                    "resolved" ||
                !this.isNonEmptyString(
                    identityResolution.recordId
                )
            ) {
                return {
                    decision: this.rejected()
                };
            }

            let existingRecordState;

            try {
                existingRecordState =
                    await this
                        .existingSemanticRecordRepository
                        .getByRecordId({
                            facilityId:
                                verifiedContext
                                    .facilityId,
                            recordId:
                                identityResolution
                                    .recordId
                        });
            } catch {
                return {
                    decision: this.rejected()
                };
            }

            if (
                !this.isPlainObject(
                    existingRecordState
                )
            ) {
                return {
                    decision: this.rejected()
                };
            }

            const safeExistingRecordState =
                this.createExistingRecordState(
                    existingRecordState
                );

            try {
                recordChange =
                    this.recordChangeResolver.resolve({
                        identityResolution,
                        existingRecordState:
                            safeExistingRecordState,
                        currentContentHash:
                            processedSemanticRecord
                                ?.contentHash,
                        currentCanonicalizationVersion:
                            processedSemanticRecord
                                ?.processingMetadata
                                ?.canonicalizationVersion
                    });
            } catch {
                return {
                    decision: this.rejected()
                };
            }

            if (
                !this.isPlainObject(recordChange) ||
                typeof recordChange.status !==
                    "string"
            ) {
                return {
                    decision: this.rejected()
                };
            }

            if (
                recordChange.status ===
                "conflict"
            ) {
                return {
                    decision: {
                        status: "conflict"
                    }
                };
            }

            if (
                ![
                    "unchanged_candidate",
                    "updated_candidate"
                ].includes(
                    recordChange.status
                )
            ) {
                return {
                    decision: this.rejected()
                };
            }

            if (
                !this.isNonEmptyString(
                    recordChange.recordId
                ) ||
                recordChange.recordId !==
                    identityResolution.recordId
            ) {
                return {
                    decision: this.rejected()
                };
            }

            if (
                !this.isNonEmptyString(
                    recordChange.recordId
                ) ||
                recordChange.recordId !==
                    identityResolution.recordId
            ) {
                return {
                    decision: this.rejected()
                };
            }
        }

        try {
            const decision =
                this.semanticStoragePolicy.evaluate({
                    residentMatching,
                    semanticPipeline,
                    ...(recordChange
                        ? { recordChange }
                        : {})
                });

            if (
                !this.isPlainObject(decision) ||
                ![
                    "confirmed_candidate",
                    "pending_review",
                    "conflict",
                    "rejected"
                ].includes(decision.status)
            ) {
                return {
                    decision: this.rejected()
                };
            }

            if (
                decision.status ===
                    "confirmed_candidate" &&
                recordChange
            ) {
                return {
                    decision,
                    recordChange
                };
            }

            return {
                decision
            };
        } catch {
            return {
                decision: this.rejected()
            };
        }
    }

    createExistingRecordState(
        existingRecordState
    ) {
        return {
            recordId:
                existingRecordState.recordId,
            contentHash:
                existingRecordState.contentHash,
            canonicalizationVersion:
                existingRecordState
                    .canonicalizationVersion
        };
    }

    rejected() {
        return {
            status: "rejected"
        };
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
    SemanticStorageDecisionService;
