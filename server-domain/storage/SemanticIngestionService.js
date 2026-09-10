"use strict";

class SemanticIngestionService {
    constructor({
        semanticRecordPipeline,
        semanticStorageDecisionService
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
            !semanticPipeline ||
            typeof semanticPipeline !== "object" ||
            Array.isArray(semanticPipeline) ||
            ![
                "pending_review",
                "new_candidate",
                "conflict",
                "resolved",
                "invalid"
            ].includes(semanticPipeline.status)
        ) {
            return this.rejected();
        }

        try {
            const decision =
                await this.semanticStorageDecisionService.decide({
                    verifiedContext,
                    residentMatching,
                    semanticPipeline
                });

            if (
                !decision ||
                typeof decision !== "object" ||
                Array.isArray(decision) ||
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

    rejected() {
        return {
            status: "rejected"
        };
    }
}

module.exports =
    SemanticIngestionService;
