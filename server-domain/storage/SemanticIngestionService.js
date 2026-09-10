"use strict";

class SemanticIngestionService {
    constructor({
        semanticRecordPipeline,
        semanticStorageDecisionService,
        semanticPersistenceService
    } = {}) {
        if (
            !semanticRecordPipeline ||
            typeof semanticRecordPipeline.process !==
                "function"
        ) {
            throw new Error(
                "SemanticIngestionService requires semanticRecordPipeline"
            );
        }

        if (
            !semanticStorageDecisionService ||
            typeof semanticStorageDecisionService !==
                "object"
        ) {
            throw new Error(
                "SemanticIngestionService requires semanticStorageDecisionService"
            );
        }

        if (
            semanticPersistenceService
        ) {
            if (
                typeof semanticPersistenceService.persist !==
                    "function"
            ) {
                throw new Error(
                    "SemanticIngestionService requires semanticPersistenceService.persist"
                );
            }

            if (
                typeof semanticStorageDecisionService
                    .decideForPersistence !==
                    "function"
            ) {
                throw new Error(
                    "SemanticIngestionService requires semanticStorageDecisionService.decideForPersistence when persistence is enabled"
                );
            }
        } else if (
            typeof semanticStorageDecisionService.decide !==
                "function"
        ) {
            throw new Error(
                "SemanticIngestionService requires semanticStorageDecisionService"
            );
        }

        this.semanticRecordPipeline =
            semanticRecordPipeline;

        this.semanticStorageDecisionService =
            semanticStorageDecisionService;

        this.semanticPersistenceService =
            semanticPersistenceService;
    }

    async ingest({
        verifiedContext,
        residentMatching,
        semanticRecord
    } = {}) {
        let semanticPipeline;

        try {
            semanticPipeline =
                await this.semanticRecordPipeline.process({
                    verifiedContext,
                    semanticRecord
                });
        } catch {
            return this.rejected();
        }

        if (
            !this.isPlainObject(
                semanticPipeline
            ) ||
            ![
                "pending_review",
                "new_candidate",
                "conflict",
                "resolved",
                "invalid"
            ].includes(
                semanticPipeline.status
            )
        ) {
            return this.rejected();
        }

        if (
            this.semanticPersistenceService
        ) {
            return this.ingestWithPersistence({
                verifiedContext,
                residentMatching,
                semanticPipeline
            });
        }

        return this.ingestWithoutPersistence({
            verifiedContext,
            residentMatching,
            semanticPipeline
        });
    }

    async ingestWithoutPersistence({
        verifiedContext,
        residentMatching,
        semanticPipeline
    }) {
        try {
            const decision =
                await this
                    .semanticStorageDecisionService
                    .decide({
                        verifiedContext,
                        residentMatching,
                        semanticPipeline
                    });

            if (
                !this.isValidDecision(
                    decision
                )
            ) {
                return this.rejected();
            }

            return decision;
        } catch {
            return this.rejected();
        }
    }

    async ingestWithPersistence({
        verifiedContext,
        residentMatching,
        semanticPipeline
    }) {
        let persistenceDecision;

        try {
            persistenceDecision =
                await this
                    .semanticStorageDecisionService
                    .decideForPersistence({
                        verifiedContext,
                        residentMatching,
                        semanticPipeline
                    });
        } catch {
            return this.rejected();
        }

        if (
            !this.isPlainObject(
                persistenceDecision
            ) ||
            !this.isValidDecision(
                persistenceDecision.decision
            )
        ) {
            return this.rejected();
        }

        const decision =
            persistenceDecision.decision;

        if (
            decision.status !==
            "confirmed_candidate"
        ) {
            return decision;
        }

        let persistenceResult;

        try {
            persistenceResult =
                await this
                    .semanticPersistenceService
                    .persist({
                        verifiedContext,
                        semanticPipeline,
                        persistenceDecision
                    });
        } catch {
            return this.rejected();
        }

        if (
            !this.isPlainObject(
                persistenceResult
            ) ||
            ![
                "updated",
                "unchanged"
            ].includes(
                persistenceResult.status
            )
        ) {
            return this.rejected();
        }

        return decision;
    }

    isValidDecision(value) {
        return (
            this.isPlainObject(value) &&
            [
                "confirmed_candidate",
                "pending_review",
                "conflict",
                "rejected"
            ].includes(value.status)
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

    rejected() {
        return {
            status: "rejected"
        };
    }
}

module.exports =
    SemanticIngestionService;
