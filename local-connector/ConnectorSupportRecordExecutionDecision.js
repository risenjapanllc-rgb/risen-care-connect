"use strict";

const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");

class ConnectorSupportRecordExecutionDecision {
    constructor({
        canonicalizer =
            new ConnectorSupportRecordCanonicalizer()
    } = {}) {
        if (
            !canonicalizer ||
            typeof canonicalizer.process !== "function"
        ) {
            throw new Error(
                "ConnectorSupportRecordExecutionDecision requires canonicalizer"
            );
        }

        this.canonicalizer = canonicalizer;
    }

    decide({
        plannedAction,
        residentId,
        recordId = null,
        baselineHash = null,
        targetHash,
        targetSemanticContent,
        currentRecord = null
    } = {}) {
        const targetCanonical =
            this.canonicalizeSemanticContent(
                targetSemanticContent
            );

        if (
            !this.isAction(plannedAction) ||
            !this.isNonEmptyString(residentId) ||
            !this.isHash(targetHash) ||
            !targetCanonical ||
            targetCanonical.contentHash !==
                targetHash
        ) {
            return this.invalid();
        }

        const normalizedResidentId =
            residentId.trim();

        if (plannedAction === "unchanged") {
            if (
                !this.isNonEmptyString(recordId) ||
                !this.isHash(baselineHash) ||
                baselineHash !== targetHash ||
                currentRecord === null
            ) {
                return this.invalid();
            }

            if (
                !this.isCompatibleCurrentRecord({
                    currentRecord,
                    residentId:
                        normalizedResidentId,
                    recordId:
                        recordId.trim()
                })
            ) {
                return {
                    status: "conflict"
                };
            }

            if (
                currentRecord.contentHash ===
                    targetHash &&
                this.currentContentMatchesTarget({
                    currentRecord,
                    targetCanonical
                })
            ) {
                return {
                    status: "already_applied"
                };
            }

            return {
                status: "conflict"
            };
        }

        if (plannedAction === "new") {
            if (baselineHash !== null) {
                return this.invalid();
            }

            if (currentRecord === null) {
                return {
                    status: "execute",
                    operation: "create"
                };
            }

            if (
                !this.isCompatibleCurrentRecord({
                    currentRecord,
                    residentId:
                        normalizedResidentId
                })
            ) {
                return {
                    status: "conflict"
                };
            }

            if (
                currentRecord.contentHash ===
                    targetHash &&
                this.currentContentMatchesTarget({
                    currentRecord,
                    targetCanonical
                })
            ) {
                return {
                    status: "already_applied"
                };
            }

            return {
                status: "conflict"
            };
        }

        if (
            !this.isNonEmptyString(recordId) ||
            !this.isHash(baselineHash)
        ) {
            return this.invalid();
        }

        if (currentRecord === null) {
            return {
                status: "conflict"
            };
        }

        if (
            !this.isCompatibleCurrentRecord({
                currentRecord,
                residentId:
                    normalizedResidentId,
                recordId:
                    recordId.trim()
            })
        ) {
            return {
                status: "conflict"
            };
        }

        if (
            currentRecord.contentHash ===
                targetHash &&
            this.currentContentMatchesTarget({
                currentRecord,
                targetCanonical
            })
        ) {
            return {
                status: "already_applied"
            };
        }

        if (
            currentRecord.contentHash ===
                baselineHash &&
            this.currentContentMatchesHash({
                currentRecord,
                expectedHash:
                    baselineHash
            })
        ) {
            return {
                status: "execute",
                operation: "update"
            };
        }

        return {
            status: "conflict"
        };
    }

    currentContentMatchesTarget({
        currentRecord,
        targetCanonical
    }) {
        const currentCanonical =
            this.canonicalizeSemanticContent(
                currentRecord.semanticContent
            );

        return (
            currentCanonical !== null &&
            currentCanonical.contentHash ===
                currentRecord.contentHash &&
            currentCanonical.contentHash ===
                targetCanonical.contentHash &&
            JSON.stringify(
                currentCanonical.semanticContent
            ) ===
                JSON.stringify(
                    targetCanonical.semanticContent
                )
        );
    }

    currentContentMatchesHash({
        currentRecord,
        expectedHash
    }) {
        const currentCanonical =
            this.canonicalizeSemanticContent(
                currentRecord.semanticContent
            );

        return (
            currentCanonical !== null &&
            currentCanonical.contentHash ===
                currentRecord.contentHash &&
            currentCanonical.contentHash ===
                expectedHash
        );
    }

    canonicalizeSemanticContent(
        semanticContent
    ) {
        if (
            !this.isPlainObject(semanticContent) ||
            semanticContent.semanticType !==
                "support_record" ||
            !this.isPlainObject(
                semanticContent.fields
            ) ||
            !this.isPlainObject(
                semanticContent.customFields
            ) ||
            Object.keys(
                semanticContent.customFields
            ).length !== 0
        ) {
            return null;
        }

        try {
            const canonical =
                this.canonicalizer.process(
                    semanticContent.fields
                );

            if (
                !canonical ||
                !this.isHash(
                    canonical.contentHash
                ) ||
                canonical.canonicalizationVersion !==
                    "risen-semantic-canonicalization-2"
            ) {
                return null;
            }

            return canonical;
        } catch {
            return null;
        }
    }

    isCompatibleCurrentRecord({
        currentRecord,
        residentId,
        recordId = null
    }) {
        return (
            this.isPlainObject(currentRecord) &&
            this.isNonEmptyString(
                currentRecord.recordId
            ) &&
            this.isNonEmptyString(
                currentRecord.residentId
            ) &&
            currentRecord.residentId.trim() ===
                residentId &&
            currentRecord.semanticType ===
                "support_record" &&
            currentRecord.canonicalizationVersion ===
                "risen-semantic-canonicalization-2" &&
            this.isHash(
                currentRecord.contentHash
            ) &&
            (
                recordId === null ||
                currentRecord.recordId.trim() ===
                    recordId
            )
        );
    }

    isAction(value) {
        return (
            value === "new" ||
            value === "update" ||
            value === "unchanged"
        );
    }

    isHash(value) {
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

    invalid() {
        return {
            status: "invalid"
        };
    }
}

module.exports =
    ConnectorSupportRecordExecutionDecision;
