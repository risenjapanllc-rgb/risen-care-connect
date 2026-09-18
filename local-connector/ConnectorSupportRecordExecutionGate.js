"use strict";

class ConnectorSupportRecordExecutionGate {
    constructor({
        importPreviewService
    } = {}) {
        if (
            !importPreviewService ||
            typeof importPreviewService.buildExecutionPlan !==
                "function"
        ) {
            throw new Error(
                "ConnectorSupportRecordExecutionGate requires importPreviewService"
            );
        }

        this.importPreviewService =
            importPreviewService;
    }

    async verify({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        expectedFingerprint
    } = {}) {
        if (
            typeof expectedFingerprint !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                expectedFingerprint
            )
        ) {
            return {
                status: "invalid"
            };
        }

        const planResult =
            await this.importPreviewService
                .buildExecutionPlan({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

        if (
            !planResult ||
            planResult.status !== "ready" ||
            typeof planResult.previewFingerprint !==
                "string" ||
            !/^[0-9a-f]{64}$/.test(
                planResult.previewFingerprint
            ) ||
            !Array.isArray(
                planResult.executionPlan
            ) ||
            planResult.executionPlan.length === 0
        ) {
            return {
                status: "blocked"
            };
        }

        if (
            planResult.previewFingerprint !==
                expectedFingerprint
        ) {
            return {
                status: "stale"
            };
        }

        return {
            status: "verified",
            previewFingerprint:
                planResult.previewFingerprint,
            executionPlan:
                planResult.executionPlan
        };
    }
}

module.exports =
    ConnectorSupportRecordExecutionGate;
