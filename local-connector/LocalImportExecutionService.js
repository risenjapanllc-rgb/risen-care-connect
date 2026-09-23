"use strict";

class LocalImportExecutionService {
    constructor({
        executionGate,
        executionService
    } = {}) {
        if (
            !executionGate ||
            typeof executionGate.verify !== "function"
        ) {
            throw new Error(
                "LocalImportExecutionService requires executionGate"
            );
        }

        if (
            !executionService ||
            typeof executionService.execute !== "function"
        ) {
            throw new Error(
                "LocalImportExecutionService requires executionService"
            );
        }

        this.executionGate = executionGate;
        this.executionService = executionService;
    }

    async execute({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        expectedFingerprint
    } = {}) {
        const verification =
            await this.executionGate.verify({
                sourceDocumentKey,
                sourceUpdatedAt,
                sourceSize,
                expectedFingerprint
            });

        if (
            !verification ||
            verification.status !== "verified" ||
            !Array.isArray(
                verification.executionPlan
            ) ||
            verification.executionPlan.length === 0
        ) {
            return {
                status:
                    verification &&
                    typeof verification.status === "string"
                        ? verification.status
                        : "blocked"
            };
        }

        return await this.executionService.execute({
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize,
            executionPlan:
                verification.executionPlan
        });
    }
}

module.exports =
    LocalImportExecutionService;
