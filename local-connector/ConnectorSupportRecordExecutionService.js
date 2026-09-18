"use strict";

const ConnectorSupportRecordExecutionDecision =
    require("./ConnectorSupportRecordExecutionDecision");

class ConnectorSupportRecordExecutionService {
    constructor({
        semanticRecordPreviewClient,
        batchWriteClient,
        executionDecision =
            new ConnectorSupportRecordExecutionDecision(),
        writeBatchSize = 100
    } = {}) {
        if (
            !semanticRecordPreviewClient ||
            typeof semanticRecordPreviewClient.lookup !== "function"
        ) {
            throw new Error("ConnectorSupportRecordExecutionService requires semanticRecordPreviewClient");
        }

        if (!batchWriteClient || typeof batchWriteClient.write !== "function") {
            throw new Error("ConnectorSupportRecordExecutionService requires batchWriteClient");
        }

        if (!executionDecision || typeof executionDecision.decide !== "function") {
            throw new Error("ConnectorSupportRecordExecutionService requires executionDecision");
        }

        if (
            !Number.isInteger(writeBatchSize) ||
            writeBatchSize < 1 ||
            writeBatchSize > 100
        ) {
            throw new Error("ConnectorSupportRecordExecutionService requires valid writeBatchSize");
        }

        this.semanticRecordPreviewClient = semanticRecordPreviewClient;
        this.batchWriteClient = batchWriteClient;
        this.executionDecision = executionDecision;
        this.writeBatchSize = writeBatchSize;
    }

    async execute({ sourceDocumentKey, executionPlan } = {}) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            !Array.isArray(executionPlan) ||
            executionPlan.length === 0
        ) {
            return { status: "invalid" };
        }

        const normalizedDocumentKey = sourceDocumentKey.trim();
        const allSourceRecordKeys = executionPlan.map(entry =>
            typeof entry?.sourceRecordKey === "string"
                ? entry.sourceRecordKey.trim()
                : ""
        );

        if (
            allSourceRecordKeys.some(key => !key) ||
            new Set(allSourceRecordKeys).size !== allSourceRecordKeys.length
        ) {
            return { status: "invalid" };
        }

        const counts = {
            processed: 0,
            created: 0,
            updated: 0,
            alreadyApplied: 0
        };

        for (let offset = 0; offset < executionPlan.length; offset += 500) {
            const lookupBatch = executionPlan.slice(offset, offset + 500);
            const keys = lookupBatch.map(entry => entry.sourceRecordKey.trim());

            let lookup;

            try {
                lookup = await this.semanticRecordPreviewClient.lookup({
                    sourceDocumentKey: normalizedDocumentKey,
                    sourceRecordKeys: keys
                });
            } catch {
                return { status: "error", ...counts };
            }

            if (
                !lookup ||
                lookup.status !== "found" ||
                !Array.isArray(lookup.records)
            ) {
                return { status: "error", ...counts };
            }

            const currentByKey = new Map();
            const requestedKeys = new Set(keys);

            for (const record of lookup.records) {
                const key =
                    typeof record?.sourceRecordKey === "string"
                        ? record.sourceRecordKey.trim()
                        : "";

                if (
                    !key ||
                    !requestedKeys.has(key) ||
                    currentByKey.has(key)
                ) {
                    return { status: "error", ...counts };
                }

                currentByKey.set(key, record);
            }

            for (
                let writeOffset = 0;
                writeOffset < lookupBatch.length;
                writeOffset += this.writeBatchSize
            ) {
                const decisionBatch = lookupBatch.slice(
                    writeOffset,
                    writeOffset + this.writeBatchSize
                );
                const pending = [];

                for (const entry of decisionBatch) {
                    const sourceRecordKey = entry.sourceRecordKey.trim();
                    let decision;

                    try {
                        decision = this.executionDecision.decide({
                            plannedAction: entry.action,
                            residentId: entry.residentId,
                            recordId: entry.recordId,
                            baselineHash: entry.baselineHash,
                            targetHash: entry.targetHash,
                            targetSemanticContent:
                                entry.targetSemanticContent,
                            currentRecord:
                                currentByKey.get(sourceRecordKey) || null
                        });
                    } catch {
                        return { status: "invalid", ...counts };
                    }

                    if (!decision || typeof decision.status !== "string") {
                        return { status: "invalid", ...counts };
                    }

                    if (decision.status === "already_applied") {
                        counts.processed += 1;
                        counts.alreadyApplied += 1;
                        continue;
                    }

                    if (decision.status === "conflict") {
                        return {
                            status: "conflict",
                            sourceRecordKey,
                            ...counts
                        };
                    }

                    if (decision.status !== "execute") {
                        return {
                            status: "invalid",
                            sourceRecordKey,
                            ...counts
                        };
                    }

                    let operation;

                    if (entry.action === "new") {
                        operation = {
                            action: "create",
                            residentId: entry.residentId,
                            sourceDocumentKey: normalizedDocumentKey,
                            sourceRecordKey,
                            contentHash: entry.targetHash,
                            canonicalizationVersion:
                                entry.canonicalizationVersion,
                            semanticContent:
                                entry.targetSemanticContent
                        };
                    } else if (entry.action === "update") {
                        operation = {
                            action: "update",
                            recordId: entry.recordId,
                            expectedContentHash: entry.baselineHash,
                            contentHash: entry.targetHash,
                            canonicalizationVersion:
                                entry.canonicalizationVersion,
                            semanticContent:
                                entry.targetSemanticContent
                        };
                    } else {
                        return {
                            status: "invalid",
                            sourceRecordKey,
                            ...counts
                        };
                    }

                    pending.push({ sourceRecordKey, operation });
                }

                if (pending.length === 0) {
                    continue;
                }

                let writeResult;

                try {
                    writeResult = await this.batchWriteClient.write(
                        pending.map(item => item.operation)
                    );
                } catch {
                    return {
                        status: "error",
                        sourceRecordKey: pending[0].sourceRecordKey,
                        ...counts
                    };
                }

                if (!writeResult || typeof writeResult.status !== "string") {
                    return {
                        status: "error",
                        sourceRecordKey: pending[0].sourceRecordKey,
                        ...counts
                    };
                }

                if (writeResult.status === "completed") {
                    counts.processed += writeResult.processed;
                    counts.created += writeResult.created;
                    counts.updated += writeResult.updated;
                    counts.alreadyApplied += writeResult.unchanged;
                    continue;
                }

                if (
                    writeResult.status === "conflict" ||
                    writeResult.status === "resident_mismatch"
                ) {
                    const failed = pending[writeResult.failedIndex];

                    if (!failed) {
                        return {
                            status: "error",
                            sourceRecordKey: pending[0].sourceRecordKey,
                            ...counts
                        };
                    }

                    counts.processed += writeResult.processed;
                    counts.created += writeResult.created;
                    counts.updated += writeResult.updated;
                    counts.alreadyApplied += writeResult.unchanged;

                    return {
                        status: writeResult.status,
                        sourceRecordKey: failed.sourceRecordKey,
                        ...counts
                    };
                }

                return {
                    status: "error",
                    sourceRecordKey: pending[0].sourceRecordKey,
                    ...counts
                };
            }
        }

        return {
            status: "completed",
            ...counts
        };
    }
}

module.exports = ConnectorSupportRecordExecutionService;
