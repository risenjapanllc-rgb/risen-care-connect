"use strict";

const RecipientCertificateSemanticCanonicalizer =
    require("./RecipientCertificateSemanticCanonicalizer");

class RecipientCertificateImportPreviewStrategy {
    constructor({ canonicalizer } = {}) {
        this.canonicalizer =
            canonicalizer ||
            new RecipientCertificateSemanticCanonicalizer();
    }

    build({ subjects } = {}) {
        if (!Array.isArray(subjects)) {
            throw new TypeError(
                "RecipientCertificateImportPreviewStrategy requires subjects"
            );
        }

        const summary = {
            existingResidentCount: 0,
            plannedNewResidentCount: 0,
            excludedCount: 0,
            deferredCount: 0,
            undecidedCount: 0,
            recipientCertificateCreateCount: 0,
            recipientCertificateUnchangedCount: 0,
            recipientCertificateUpdateCount: 0,
            missingSemanticRecordCount: 0
        };

        const items = [];

        for (const subject of subjects) {
            if (!subject || typeof subject !== "object") {
                throw new TypeError(
                    "Recipient certificate subject is invalid"
                );
            }

            let resolution = "undecided";

            if (subject.existingResidentConfirmed === true) {
                resolution = "existing";
                summary.existingResidentCount += 1;
            } else if (subject.admissionDecision === "approved_new") {
                resolution = "planned_new";
                summary.plannedNewResidentCount += 1;
            } else if (subject.admissionDecision === "rejected") {
                resolution = "excluded";
                summary.excludedCount += 1;
            } else if (subject.admissionDecision === "deferred") {
                resolution = "deferred";
                summary.deferredCount += 1;
            } else {
                summary.undecidedCount += 1;
            }

            const includedForPersistence =
                ["existing", "planned_new"].includes(resolution);

            const semanticRecords =
                includedForPersistence &&
                Array.isArray(subject.semanticRecords)
                    ? subject.semanticRecords
                    : [];

            let persistenceAction = null;
            let persistenceContract = null;

            if (includedForPersistence) {
                if (semanticRecords.length === 0) {
                    summary.missingSemanticRecordCount += 1;
                } else {
                    if (semanticRecords.length !== 1) {
                        throw new TypeError(
                            "Recipient certificate requires exactly one semantic record per subject"
                        );
                    }

                    const plannedValues =
                        semanticRecords[0]?.semanticValues || {};

                    const canonical =
                        this.canonicalizer.canonicalize(plannedValues);

                    const existing =
                        subject.existingSemanticRecord || null;

                    if (!existing) {
                        persistenceAction = "create";
                    } else {
                        if (
                            typeof existing.contentHash !== "string" ||
                            !/^[0-9a-f]{64}$/.test(existing.contentHash) ||
                            typeof existing.canonicalizationVersion !== "string" ||
                            !existing.canonicalizationVersion.trim()
                        ) {
                            throw new TypeError(
                                "Existing recipient certificate state is invalid"
                            );
                        }

                        if (
                            existing.canonicalizationVersion !==
                            canonical.canonicalizationVersion
                        ) {
                            throw new TypeError(
                                "Recipient certificate canonicalization version is incompatible"
                            );
                        }

                        persistenceAction =
                            existing.contentHash === canonical.contentHash
                                ? "unchanged"
                                : "update";
                    }

                    persistenceContract = {
                        semanticType: "recipient_certificate",
                        logicalSlot: "primary",
                        semanticContent:
                            canonical.canonicalSemanticContent,
                        contentHash: canonical.contentHash,
                        canonicalizationVersion:
                            canonical.canonicalizationVersion,
                        expectedContentHash:
                            existing ? existing.contentHash : null
                    };
                }
            }

            if (persistenceAction === "create") {
                summary.recipientCertificateCreateCount += 1;
            } else if (persistenceAction === "unchanged") {
                summary.recipientCertificateUnchangedCount += 1;
            } else if (persistenceAction === "update") {
                summary.recipientCertificateUpdateCount += 1;
            }

            const identifierType =
                typeof subject.identifierType === "string"
                    ? subject.identifierType.trim()
                    : "";

            const identifierDigest =
                typeof subject.identifierDigest === "string"
                    ? subject.identifierDigest.trim()
                    : "";

            if (
                includedForPersistence &&
                (
                    !["user_code", "name"].includes(identifierType) ||
                    !/^[0-9a-f]{64}$/.test(identifierDigest)
                )
            ) {
                throw new TypeError(
                    "Recipient certificate subject identity is invalid"
                );
            }

            items.push({
                resolution,
                identifierType:
                    identifierType || null,
                identifierDigest:
                    identifierDigest || null,
                residentId:
                    typeof subject.residentId === "string" &&
                    subject.residentId.trim()
                        ? subject.residentId.trim()
                        : null,
                displayName:
                    typeof subject.displayName === "string" &&
                    subject.displayName.trim()
                        ? subject.displayName.trim()
                        : null,
                persistenceAction,
                persistenceContract,
                semanticRecords
            });
        }

        const ready =
            summary.deferredCount === 0 &&
            summary.undecidedCount === 0 &&
            summary.missingSemanticRecordCount === 0;

        return {
            status: ready ? "preview_only" : "blocked",
            executionAvailable: false,
            summary,
            items
        };
    }
}

module.exports =
    RecipientCertificateImportPreviewStrategy;
