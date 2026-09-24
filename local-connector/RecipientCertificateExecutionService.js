"use strict";

class RecipientCertificateExecutionService {
    constructor({
        sourceResidentMappingClient,
        atomicPersistenceClient
    } = {}) {
        if (
            !sourceResidentMappingClient ||
            typeof sourceResidentMappingClient.list !== "function"
        ) {
            throw new Error("RecipientCertificateExecutionService requires sourceResidentMappingClient");
        }
        if (
            !atomicPersistenceClient ||
            typeof atomicPersistenceClient.persist !== "function"
        ) {
            throw new Error("RecipientCertificateExecutionService requires atomicPersistenceClient");
        }

        this.sourceResidentMappingClient =
            sourceResidentMappingClient;
        this.atomicPersistenceClient =
            atomicPersistenceClient;
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
            }

            let residentProfile;

            if (entry.resolution === "existing") {
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

                residentProfile = {
                    name: name.trim(),
                    ...comparison.fill
                };
            } else {
                residentProfile = {};

                for (const key of [
                    "name",
                    "birth_date",
                    "gender",
                    "user_code"
                ]) {
                    const semanticKey =
                        "user." + key;

                    if (
                        Object.prototype.hasOwnProperty.call(
                            entry.persistenceContract.semanticContent,
                            semanticKey
                        )
                    ) {
                        residentProfile[key] =
                            entry.persistenceContract.semanticContent[
                                semanticKey
                            ];
                    }
                }
            }

            const contract = {
                resolution:
                    entry.resolution,
                identifierType:
                    entry.identifierType,
                identifierDigest:
                    entry.identifierDigest,
                residentId:
                    entry.resolution === "existing"
                        ? residentId
                        : null,
                displayName:
                    typeof entry.displayName === "string"
                        ? entry.displayName.trim()
                        : null,
                residentProfile,
                semantic: {
                    semanticType:
                        entry.persistenceContract.semanticType,
                    logicalSlot:
                        entry.persistenceContract.logicalSlot,
                    semanticContent:
                        entry.persistenceContract.semanticContent,
                    contentHash:
                        entry.persistenceContract.contentHash,
                    canonicalizationVersion:
                        entry.persistenceContract.canonicalizationVersion,
                    expectedContentHash:
                        entry.persistenceContract.expectedContentHash
                },
                sourceDocumentKey:
                    snapshot.sourceDocumentKey,
                sourceUpdatedAt:
                    snapshot.sourceUpdatedAt,
                sourceSize:
                    snapshot.sourceSize
            };

            let persisted;

            try {
                persisted =
                    await this.atomicPersistenceClient.persist(
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

                if (persisted.residentCreated === true) {
                    counts.residentsCreated += 1;
                }

                continue;
            }

            if (
                [
                    "stale",
                    "not_approved",
                    "conflict",
                    "name_conflict",
                    "user_code_conflict"
                ].includes(persisted?.status)
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
