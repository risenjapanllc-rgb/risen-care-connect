"use strict";

const {
    createResidentAdmissionSubjectKey
} = require("./ResidentAdmissionSubjectKey");
const {
    ResidentProfileProjection
} = require("../server-domain/resident/ResidentProfileProjection");

class RecipientCertificateImportPreviewService {
    constructor({
        candidateResolver,
        sourceResidentMappingClient,
        admissionDecisionService,
        localConnectorService = null,
        sourceFieldMappingClient = null,
        sourceFieldInterpretationClient = null,
        semanticPlanner = null,
        semanticLogicalRecordClient = null,
        residentProfileQueryClient = null,
        residentProfileProjection =
            new ResidentProfileProjection(),
        previewFingerprint,
        strategy
    } = {}) {
        if (!candidateResolver || typeof candidateResolver.findCandidateGroups !== "function") {
            throw new Error("RecipientCertificateImportPreviewService requires candidateResolver");
        }
        if (!sourceResidentMappingClient || typeof sourceResidentMappingClient.list !== "function") {
            throw new Error("RecipientCertificateImportPreviewService requires sourceResidentMappingClient");
        }
        if (!admissionDecisionService || typeof admissionDecisionService.list !== "function") {
            throw new Error("RecipientCertificateImportPreviewService requires admissionDecisionService");
        }
        if (!previewFingerprint || typeof previewFingerprint.create !== "function") {
            throw new Error("RecipientCertificateImportPreviewService requires previewFingerprint");
        }
        if (!strategy || typeof strategy.build !== "function") {
            throw new Error("RecipientCertificateImportPreviewService requires strategy");
        }

        this.candidateResolver = candidateResolver;
        this.sourceResidentMappingClient = sourceResidentMappingClient;
        this.admissionDecisionService = admissionDecisionService;
        this.localConnectorService = localConnectorService;
        this.sourceFieldMappingClient = sourceFieldMappingClient;
        this.sourceFieldInterpretationClient = sourceFieldInterpretationClient;
        this.semanticPlanner = semanticPlanner;
        this.semanticLogicalRecordClient = semanticLogicalRecordClient;
        this.residentProfileQueryClient =
            residentProfileQueryClient;
        this.residentProfileProjection =
            residentProfileProjection;
        this.previewFingerprint = previewFingerprint;
        this.strategy = strategy;
    }

    async preview(snapshot) {
        const result = await this._build(snapshot);

        const {
            executionPlan,
            ...publicResult
        } = result;

        return publicResult;
    }

    async buildExecutionPlan(snapshot) {
        const result = await this._build(snapshot);

        if (
            result.status !== "preview_only" ||
            typeof result.previewFingerprint !== "string" ||
            !/^[0-9a-f]{64}$/.test(result.previewFingerprint) ||
            !Array.isArray(result.executionPlan) ||
            result.executionPlan.length === 0
        ) {
            return {
                status: "blocked"
            };
        }

        return {
            status: "ready",
            previewFingerprint:
                result.previewFingerprint,
            executionPlan:
                result.executionPlan
        };
    }

    async _build(snapshot) {
        const resolvedSnapshot =
            this.localConnectorService &&
            typeof this.localConnectorService
                .resolveSourceSnapshot === "function"
                ? await this.localConnectorService
                    .resolveSourceSnapshot(snapshot)
                : snapshot;

        let semanticPlan = null;

        if (
            this.localConnectorService &&
            this.sourceFieldMappingClient &&
            this.sourceFieldInterpretationClient &&
            this.semanticPlanner
        ) {
            const mappingResult =
                await this.sourceFieldMappingClient.list(
                    resolvedSnapshot.sourceDocumentKey,
                    resolvedSnapshot.sourceUpdatedAt,
                    resolvedSnapshot.sourceSize
                );

            const interpretationResult =
                await this.sourceFieldInterpretationClient.list({
                    sourceDocumentKey:
                        resolvedSnapshot.sourceDocumentKey,
                    sourceUpdatedAt:
                        resolvedSnapshot.sourceUpdatedAt,
                    sourceSize:
                        resolvedSnapshot.sourceSize
                });

            if (
                mappingResult?.status !== "found" ||
                !Array.isArray(mappingResult.mappings) ||
                interpretationResult?.status !== "found" ||
                !Array.isArray(interpretationResult.interpretations)
            ) {
                throw new Error(
                    "Recipient certificate semantic mappings are unavailable"
                );
            }

            const {
                humanConfirmedMappings
            } = require("./HumanConfirmedFieldMappingResolver")
                .resolveHumanConfirmedFieldMappings(
                    mappingResult.mappings,
                    interpretationResult.interpretations
                );

            const sourceEntities =
                resolvedSnapshot.analysis?.extracted?.sourceEntities;

            if (!Array.isArray(sourceEntities)) {
                throw new Error(
                    "Recipient certificate source entities are unavailable"
                );
            }

            semanticPlan =
                this.semanticPlanner.build({
                    sourceEntities,
                    fieldMappings:
                        humanConfirmedMappings
                });
        }

        const candidateResult =
            await this.candidateResolver.findCandidateGroups(
                resolvedSnapshot
            );

        if (!candidateResult || !Array.isArray(candidateResult.groups)) {
            throw new Error("Recipient certificate candidate groups are unavailable");
        }

        const mappingResult =
            await this.sourceResidentMappingClient.list(
                resolvedSnapshot
            );

        if (mappingResult?.status !== "found" || !Array.isArray(mappingResult.mappings)) {
            throw new Error("Recipient certificate resident mappings are unavailable");
        }

        const decisionResult =
            await this.admissionDecisionService.list(
                resolvedSnapshot
            );

        if (decisionResult?.status !== "found" || !Array.isArray(decisionResult.decisions)) {
            throw new Error("Recipient certificate admission decisions are unavailable");
        }

        const mappingIndex = new Map();

        for (const mapping of mappingResult.mappings) {
            if (
                mapping &&
                ["user_code", "name"].includes(mapping.identifierType) &&
                typeof mapping.identifierDigest === "string"
            ) {
                mappingIndex.set(
                    mapping.identifierType + ":" + mapping.identifierDigest,
                    mapping
                );
            }
        }

        const decisionIndex = new Map();

        for (const decision of decisionResult.decisions) {
            if (
                decision &&
                typeof decision.sourceEntityKey === "string" &&
                decision.sourceEntityKey.trim()
            ) {
                decisionIndex.set(
                    decision.sourceEntityKey.trim(),
                    decision
                );
            }
        }

        const semanticPlanIndex =
            new Map();

        if (Array.isArray(semanticPlan)) {
            for (const item of semanticPlan) {
                if (
                    !item ||
                    typeof item.sourceEntityKey !== "string" ||
                    !item.sourceEntityKey.trim()
                ) {
                    const error =
                        new Error(
                            "Recipient certificate semantic plan is invalid"
                        );
                    error.code =
                        "recipient_certificate_semantic_plan_invalid";
                    throw error;
                }

                const key =
                    item.sourceEntityKey.trim();

                if (semanticPlanIndex.has(key)) {
                    const error =
                        new Error(
                            "Recipient certificate semantic source entity is duplicated"
                        );
                    error.code =
                        "recipient_certificate_semantic_plan_ambiguous";
                    throw error;
                }

                semanticPlanIndex.set(
                    key,
                    item
                );
            }
        }

        const subjects = candidateResult.groups.map(group => {
            const mappingKey =
                group.identifierType + ":" + group.identifierDigest;

            const mapping = mappingIndex.get(mappingKey) || null;

            const sourceEntityKey =
                createResidentAdmissionSubjectKey({
                    identifierType: group.identifierType,
                    identifierDigest: group.identifierDigest
                });

            const decision =
                decisionIndex.get(sourceEntityKey) || null;

            const semanticRecords =
                Array.isArray(group.sourceEntityKeys)
                    ? group.sourceEntityKeys.map(
                        sourceEntityKey => {
                            if (
                                typeof sourceEntityKey !== "string" ||
                                !sourceEntityKey.trim()
                            ) {
                                const error =
                                    new Error(
                                        "Recipient certificate source entity linkage is invalid"
                                    );
                                error.code =
                                    "recipient_certificate_semantic_linkage_invalid";
                                throw error;
                            }

                            const semanticRecord =
                                semanticPlanIndex.get(
                                    sourceEntityKey.trim()
                                );

                            if (
                                Array.isArray(semanticPlan) &&
                                !semanticRecord
                            ) {
                                const error =
                                    new Error(
                                        "Recipient certificate semantic linkage is incomplete"
                                    );
                                error.code =
                                    "recipient_certificate_semantic_linkage_incomplete";
                                throw error;
                            }

                            return semanticRecord || null;
                        }
                    ).filter(Boolean)
                    : [];

            const existingResidentId =
                mapping &&
                mapping.mappingStatus === "confirmed" &&
                typeof mapping.residentId === "string" &&
                mapping.residentId.trim()
                    ? mapping.residentId.trim()
                    : null;

            return {
                identifierType: group.identifierType,
                identifierDigest: group.identifierDigest,
                residentId: existingResidentId,
                displayName:
                    group.identifierType === "name" &&
                    typeof group.identifierValue === "string" &&
                    group.identifierValue.trim()
                        ? group.identifierValue.trim()
                        : null,
                existingResidentConfirmed:
                    Boolean(existingResidentId),
                admissionDecision:
                    decision && typeof decision.decision === "string"
                        ? decision.decision
                        : null,
                semanticRecords
            };
        });

        if (this.semanticLogicalRecordClient) {
            for (const subject of subjects) {
                if (!subject.existingResidentConfirmed) {
                    continue;
                }

                const lookup =
                    await this.semanticLogicalRecordClient.lookup({
                        residentId: subject.residentId,
                        semanticType: "recipient_certificate",
                        logicalSlot: "primary"
                    });

                if (lookup?.status === "found") {
                    subject.existingSemanticRecord =
                        lookup.record;
                } else if (lookup?.status === "not_found") {
                    subject.existingSemanticRecord = null;
                } else {
                    const error = new Error(
                        "Recipient certificate logical lookup is unavailable"
                    );
                    error.code =
                        "recipient_certificate_logical_lookup_unavailable";
                    throw error;
                }
            }
        }

        const result = this.strategy.build({ subjects });

        const includedItems =
            result.status === "preview_only" &&
            Array.isArray(result.items)
                ? result.items.filter(
                    item =>
                        ["existing", "planned_new"].includes(
                            item.resolution
                        )
                )
                : [];

        const executionSafe =
            includedItems.length > 0 &&
            includedItems.every(item =>
                item &&
                item.persistenceContract &&
                ["create", "update", "unchanged"].includes(
                    item.persistenceAction
                ) &&
                (
                    item.resolution !== "planned_new" ||
                    (
                        item.identifierType === "name" &&
                        typeof item.displayName === "string" &&
                        item.displayName.trim()
                    )
                )
            );

        let executionPlan =
            executionSafe
                ? includedItems.map(item => ({
                    resolution: item.resolution,
                    identifierType: item.identifierType,
                    identifierDigest: item.identifierDigest,
                    residentId: item.residentId,
                    displayName: item.displayName,
                    persistenceAction:
                        item.persistenceAction,
                    persistenceContract:
                        item.persistenceContract
                }))
                : [];

        if (
            executionPlan.some(
                item => item.resolution === "existing"
            )
        ) {
            if (
                !this.residentProfileQueryClient ||
                typeof this.residentProfileQueryClient.get !==
                    "function" ||
                !this.residentProfileProjection ||
                typeof this.residentProfileProjection.project !==
                    "function"
            ) {
                executionPlan = [];
            } else {
                const enrichedPlan = [];

                for (const item of executionPlan) {
                    if (item.resolution !== "existing") {
                        enrichedPlan.push(item);
                        continue;
                    }

                    const profileResult =
                        await this.residentProfileQueryClient.get({
                            sourceDocumentKey:
                                resolvedSnapshot.sourceDocumentKey,
                            identifierType:
                                item.identifierType,
                            identifierDigest:
                                item.identifierDigest,
                            sourceUpdatedAt:
                                resolvedSnapshot.sourceUpdatedAt,
                            sourceSize:
                                resolvedSnapshot.sourceSize
                        });

                    if (
                        !profileResult ||
                        profileResult.status !== "found" ||
                        !profileResult.profile ||
                        profileResult.profile.residentId !==
                            item.residentId
                    ) {
                        executionPlan = [];
                        break;
                    }

                    const residentProfileComparison =
                        this.residentProfileProjection.project({
                            semanticContent:
                                item.persistenceContract
                                    .semanticContent,
                            currentResident:
                                profileResult.profile
                        });

                    enrichedPlan.push({
                        ...item,
                        residentProfileComparison
                    });
                }

                if (executionPlan.length > 0) {
                    executionPlan = enrichedPlan;

                    const comparisonByIdentity =
                        new Map(
                            enrichedPlan
                                .filter(
                                    item =>
                                        item.resolution ===
                                            "existing" &&
                                        item.residentProfileComparison
                                )
                                .map(
                                    item => [
                                        `${item.identifierType}:${item.identifierDigest}`,
                                        item.residentProfileComparison
                                    ]
                                )
                        );

                    if (Array.isArray(result.items)) {
                        result.items =
                            result.items.map(item => {
                                if (
                                    item?.resolution !==
                                        "existing"
                                ) {
                                    return item;
                                }

                                const comparison =
                                    comparisonByIdentity.get(
                                        `${item.identifierType}:${item.identifierDigest}`
                                    );

                                return comparison
                                    ? {
                                        ...item,
                                        residentProfileComparison:
                                            comparison
                                    }
                                    : item;
                            });
                    }
                }
            }
        }

        const previewFingerprint =
            executionPlan.length > 0
                ? this.previewFingerprint.create(
                    executionPlan
                )
                : null;

        return {
            ...result,
            executionAvailable:
                executionPlan.length > 0 &&
                typeof previewFingerprint === "string" &&
                /^[0-9a-f]{64}$/.test(
                    previewFingerprint
                ),
            previewFingerprint,
            executionPlan,
            sourceEntityCount:
                candidateResult.sourceEntityCount,
            residentSubjectCount:
                candidateResult.groups.length,
            unavailableSourceEntityCount:
                candidateResult.unavailableSourceEntityCount
        };
    }
}

module.exports = RecipientCertificateImportPreviewService;
