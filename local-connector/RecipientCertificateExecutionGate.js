"use strict";

class RecipientCertificateExecutionGate {
    constructor({ importPreviewService } = {}) {
        if (
            !importPreviewService ||
            typeof importPreviewService.buildExecutionPlan !== "function"
        ) {
            throw new Error(
                "RecipientCertificateExecutionGate requires importPreviewService"
            );
        }

        this.importPreviewService = importPreviewService;
    }

    async verify({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        expectedFingerprint
    } = {}) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            typeof expectedFingerprint !== "string" ||
            !/^[0-9a-f]{64}$/.test(expectedFingerprint)
        ) {
            return { status: "invalid" };
        }

        const result =
            await this.importPreviewService.buildExecutionPlan({
                sourceDocumentKey: sourceDocumentKey.trim(),
                sourceUpdatedAt: sourceUpdatedAt.trim(),
                sourceSize
            });

        if (
            result?.status !== "ready" ||
            typeof result.previewFingerprint !== "string" ||
            !/^[0-9a-f]{64}$/.test(result.previewFingerprint) ||
            !Array.isArray(result.executionPlan) ||
            result.executionPlan.length === 0
        ) {
            return { status: "blocked" };
        }

        if (
            result.previewFingerprint !== expectedFingerprint
        ) {
            return {
                status: "stale",
                previewFingerprint:
                    result.previewFingerprint
            };
        }

        return {
            status: "verified",
            previewFingerprint:
                result.previewFingerprint,
            executionPlan:
                result.executionPlan
        };
    }
}

module.exports = RecipientCertificateExecutionGate;
