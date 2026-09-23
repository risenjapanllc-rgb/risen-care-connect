"use strict";

const { ResidentProfileProjection } = require("../server-domain/resident/ResidentProfileProjection");

class RecipientCertificateExecutionService {
    constructor({
        sourceResidentMappingClient,
        residentAdmissionClient,
        residentProfileClient,
        semanticPersistenceClient
    } = {}) {
        if (
            !sourceResidentMappingClient ||
            typeof sourceResidentMappingClient.list !== "function"
        ) {
            throw new Error("RecipientCertificateExecutionService requires sourceResidentMappingClient");
        }
        if (
            !residentAdmissionClient ||
            typeof residentAdmissionClient.admit !== "function"
        ) {
            throw new Error("RecipientCertificateExecutionService requires residentAdmissionClient");
        }
        if (
            !semanticPersistenceClient ||
            typeof semanticPersistenceClient.persist !== "function"
        ) {
            throw new Error("RecipientCertificateExecutionService requires semanticPersistenceClient");
        }

        this.sourceResidentMappingClient =
            sourceResidentMappingClient;
        this.residentAdmissionClient =
            residentAdmissionClient;
        this.residentProfileClient =
            residentProfileClient || null;
        this.semanticPersistenceClient =
            semanticPersistenceClient;
    }

    async execute({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        executionPlan
    } = {}) {
        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim() ||
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            !Array.isArray(executionPlan) ||
            executionPlan.length === 0
        ) {
            return { status: "invalid" };
        }

        const snapshot = {
            sourceDocumentKey: sourceDocumentKey.trim(),
            sourceUpdatedAt: sourceUpdatedAt.trim(),
            sourceSize
        };

        const planIdentityKeys = new Set();

        for (const entry of executionPlan) {
            if (!this.isValidEntry(entry)) {
                return {
                    status: "invalid",
                    processed: 0
                };
            }

            const identityKey =
                entry.identifierType +
                ":" +
                entry.identifierDigest;

            if (planIdentityKeys.has(identityKey)) {
                return {
                    status: "conflict",
                    processed: 0
                };
            }

            planIdentityKeys.add(identityKey);
        }

        let mappingResult;

        try {
            mappingResult =
                await this.sourceResidentMappingClient.list(
                    snapshot
                );
        } catch {
            return { status: "error", processed: 0 };
        }

        if (
            mappingResult?.status !== "found" ||
            !Array.isArray(mappingResult.mappings)
        ) {
            return { status: "error", processed: 0 };
        }

        const mappingIndex = new Map();

        for (const mapping of mappingResult.mappings) {
            if (
                !mapping ||
                !["user_code", "name"].includes(
                    mapping.identifierType
                ) ||
                typeof mapping.identifierDigest !== "string" ||
                !/^[0-9a-f]{64}$/.test(
                    mapping.identifierDigest
                )
            ) {
                return { status: "invalid", processed: 0 };
            }

            const key =
                mapping.identifierType +
                ":" +
                mapping.identifierDigest;

            if (mappingIndex.has(key)) {
                return { status: "conflict", processed: 0 };
            }

            mappingIndex.set(key, mapping);
        }

        const counts = {
            processed: 0,
            created: 0,
            updated: 0,
            unchanged: 0,
            residentsCreated: 0
        };

        for (const entry of executionPlan) {
            const identityKey =
                entry.identifierType +
                ":" +
                entry.identifierDigest;

            const currentMapping =
                mappingIndex.get(identityKey) || null;

            let residentId = null;

            if (
                currentMapping &&
                currentMapping.mappingStatus === "confirmed" &&
                typeof currentMapping.residentId === "string" &&
                currentMapping.residentId.trim()
            ) {
                residentId = currentMapping.residentId.trim();

                if (
                    entry.resolution === "existing" &&
                    residentId !== entry.residentId
                ) {
                    return {
                        status: "conflict",
                        identifierType: entry.identifierType,
                        identifierDigest: entry.identifierDigest,
                        ...counts
                    };
                }
            } else if (entry.resolution === "existing") {
                return {
                    status: "conflict",
                    identifierType: entry.identifierType,
                    identifierDigest: entry.identifierDigest,
                    ...counts
                };
            } else {
                let admission;

                try {
                    admission =
                        await this.residentAdmissionClient.admit({
                            sourceDocumentKey:
                                snapshot.sourceDocumentKey,
                            identifierType:
                                entry.identifierType,
                            identifierDigest:
                                entry.identifierDigest,
                            name:
                                entry.displayName.trim(),
                            residentProfile:
                                new ResidentProfileProjection().project({
                                    semanticContent:
                                        entry.persistenceContract.semanticContent,
                                    currentResident: {}
                                }).fill,
                            sourceUpdatedAt:
                                snapshot.sourceUpdatedAt,
                            sourceSize:
                                snapshot.sourceSize
                        });
                } catch {
                    return { status: "error", ...counts };
                }

                if (
                    admission?.status === "created" ||
                    admission?.status === "existing"
                ) {
                    if (
                        typeof admission.residentId !== "string" ||
                        !admission.residentId.trim()
                    ) {
                        return { status: "error", ...counts };
                    }

                    residentId = admission.residentId.trim();

                    if (admission.residentCreated === true) {
                        counts.residentsCreated += 1;
                    }
                } else if (
                    ["stale", "not_approved", "conflict", "name_conflict"]
                        .includes(admission?.status)
                ) {
                    return {
                        status: admission.status,
                        identifierType: entry.identifierType,
                        identifierDigest: entry.identifierDigest,
                        ...counts
                    };
                } else {
                    return { status: "error", ...counts };
                }
            }

            if (entry.resolution === "existing") {
                if (
                    !this.residentProfileClient ||
                    typeof this.residentProfileClient.fill !== "function"
                ) {
                    return { status: "error", ...counts };
                }

                const comparison =
                    entry.residentProfileComparison;

                if (
                    !comparison ||
                    typeof comparison !== "object" ||
                    !comparison.fill ||
                    typeof comparison.fill !== "object" ||
                    Array.isArray(comparison.fill) ||
                    !comparison.conflicts ||
                    typeof comparison.conflicts !== "object" ||
                    Array.isArray(comparison.conflicts)
                ) {
                    return { status: "invalid", ...counts };
                }

                if (
                    Object.keys(comparison.conflicts).length > 0
                ) {
                    return {
                        status: "conflict",
                        identifierType: entry.identifierType,
                        identifierDigest: entry.identifierDigest,
                        ...counts
                    };
                }

                const name =
                    typeof entry.displayName === "string" &&
                    entry.displayName.trim()
                        ? entry.displayName.trim()
                        : entry.persistenceContract.semanticContent[
                            "user.name"
                        ];

                if (
                    typeof name !== "string" ||
                    !name.trim()
                ) {
                    return { status: "invalid", ...counts };
                }

                let profileResult;

                try {
                    profileResult =
                        await this.residentProfileClient.fill({
                            sourceDocumentKey:
                                snapshot.sourceDocumentKey,
                            identifierType:
                                entry.identifierType,
                            identifierDigest:
                                entry.identifierDigest,
                            name: name.trim(),
                            residentProfile: {
                                name: name.trim(),
                                ...comparison.fill
                            },
                            sourceUpdatedAt:
                                snapshot.sourceUpdatedAt,
                            sourceSize:
                                snapshot.sourceSize
                        });
                } catch {
                    return { status: "error", ...counts };
                }

                if (
                    profileResult?.status !== "filled" &&
                    profileResult?.status !== "unchanged"
                ) {
                    if (
                        [
                            "stale",
                            "not_confirmed",
                            "conflict",
                            "user_code_conflict"
                        ].includes(profileResult?.status)
                    ) {
                        return {
                            status: profileResult.status,
                            identifierType:
                                entry.identifierType,
                            identifierDigest:
                                entry.identifierDigest,
                            ...counts
                        };
                    }

                    return { status: "error", ...counts };
                }

                if (
                    typeof profileResult.residentId === "string" &&
                    profileResult.residentId.trim() &&
                    profileResult.residentId.trim() !== residentId
                ) {
                    return {
                        status: "conflict",
                        identifierType: entry.identifierType,
                        identifierDigest: entry.identifierDigest,
                        ...counts
                    };
                }
            }

            const contract = {
                residentId,
                semanticType:
                    entry.persistenceContract.semanticType,
                logicalSlot:
                    entry.persistenceContract.logicalSlot,
                sourceDocumentKey:
                    snapshot.sourceDocumentKey,
                sourceUpdatedAt:
                    snapshot.sourceUpdatedAt,
                sourceSize:
                    snapshot.sourceSize,
                expectedContentHash:
                    entry.persistenceContract.expectedContentHash,
                contentHash:
                    entry.persistenceContract.contentHash,
                canonicalizationVersion:
                    entry.persistenceContract.canonicalizationVersion,
                semanticContent:
                    entry.persistenceContract.semanticContent
            };

            let persisted;

            try {
                persisted =
                    await this.semanticPersistenceClient.persist(
                        contract
                    );
            } catch {
                return { status: "error", ...counts };
            }

            if (
                persisted?.status === "created" ||
                persisted?.status === "updated" ||
                persisted?.status === "unchanged"
            ) {
                counts.processed += 1;
                counts[persisted.status] += 1;
                continue;
            }

            if (
                persisted?.status === "stale" ||
                persisted?.status === "conflict"
            ) {
                return {
                    status: persisted.status,
                    identifierType: entry.identifierType,
                    identifierDigest: entry.identifierDigest,
                    ...counts
                };
            }

            return { status: "error", ...counts };
        }

        return {
            status: "completed",
            ...counts
        };
    }

    isValidEntry(entry) {
        if (
            !entry ||
            typeof entry !== "object" ||
            !["existing", "planned_new"].includes(entry.resolution) ||
            !["user_code", "name"].includes(entry.identifierType) ||
            typeof entry.identifierDigest !== "string" ||
            !/^[0-9a-f]{64}$/.test(entry.identifierDigest) ||
            !["create", "update", "unchanged"].includes(
                entry.persistenceAction
            ) ||
            !entry.persistenceContract ||
            typeof entry.persistenceContract !== "object"
        ) {
            return false;
        }

        if (
            entry.resolution === "existing" &&
            (
                typeof entry.residentId !== "string" ||
                !entry.residentId.trim()
            )
        ) {
            return false;
        }

        if (
            entry.resolution === "planned_new" &&
            (
                entry.identifierType !== "name" ||
                typeof entry.displayName !== "string" ||
                !entry.displayName.trim()
            )
        ) {
            return false;
        }

        const contract = entry.persistenceContract;

        return (
            contract.semanticType === "recipient_certificate" &&
            contract.logicalSlot === "primary" &&
            typeof contract.contentHash === "string" &&
            /^[0-9a-f]{64}$/.test(contract.contentHash) &&
            typeof contract.canonicalizationVersion === "string" &&
            contract.canonicalizationVersion.trim() &&
            (
                contract.expectedContentHash === null ||
                (
                    typeof contract.expectedContentHash === "string" &&
                    /^[0-9a-f]{64}$/.test(
                        contract.expectedContentHash
                    )
                )
            ) &&
            contract.semanticContent &&
            typeof contract.semanticContent === "object" &&
            !Array.isArray(contract.semanticContent)
        );
    }
}

module.exports = RecipientCertificateExecutionService;
