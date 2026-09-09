"use strict";

class SemanticStorageDecisionService {
    constructor({
        recordChangeResolver,
        semanticStoragePolicy
    } = {}) {
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

        this.recordChangeResolver =
            recordChangeResolver;
        this.semanticStoragePolicy =
            semanticStoragePolicy;
    }

    decide({
        residentMatching,
        semanticPipeline,
        existingRecordState
    } = {}) {
        if (
            !this.isPlainObject(semanticPipeline)
        ) {
            return this.rejected();
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
                return this.rejected();
            }

            if (
                !this.isPlainObject(recordChange) ||
                typeof recordChange.status !==
                    "string"
            ) {
                return this.rejected();
            }

            if (
                recordChange.status ===
                "conflict"
            ) {
                return {
                    status: "conflict"
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
                return this.rejected();
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
                return this.rejected();
            }

            return decision;
        } catch {
            return this.rejected();
        }
    }

    createExistingRecordState(
        existingRecordState
    ) {
        if (
            !this.isPlainObject(
                existingRecordState
            )
        ) {
            return existingRecordState;
        }

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
