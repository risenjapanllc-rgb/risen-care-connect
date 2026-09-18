"use strict";

const crypto = require("node:crypto");
const ConnectorSupportRecordRowBuilder =
    require("./ConnectorSupportRecordRowBuilder");
const ConnectorSupportRecordPreviewComparator =
    require("./ConnectorSupportRecordPreviewComparator");
const ConnectorSupportRecordCanonicalizer =
    require("../server-domain/semantic/ConnectorSupportRecordCanonicalizer");
const ConnectorSupportRecordPreviewFingerprint =
    require("./ConnectorSupportRecordPreviewFingerprint");

class LocalImportPreviewService {
    constructor({
        localConnectorService,
        sourceFieldMappingClient,
        sourceResidentMappingClient,
        sourceRecordIdentityMappingClient,
        semanticRecordPreviewClient,
        rowBuilder =
            new ConnectorSupportRecordRowBuilder(),
        canonicalizer =
            new ConnectorSupportRecordCanonicalizer(),
        previewComparator =
            new ConnectorSupportRecordPreviewComparator(),
        previewFingerprint =
            new ConnectorSupportRecordPreviewFingerprint()
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService.resolveSourceSnapshot !== "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires localConnectorService"
            );
        }

        if (
            !sourceFieldMappingClient ||
            typeof sourceFieldMappingClient.list !== "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires sourceFieldMappingClient"
            );
        }

        if (
            !sourceResidentMappingClient ||
            typeof sourceResidentMappingClient.list !== "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires sourceResidentMappingClient"
            );
        }

        this.localConnectorService =
            localConnectorService;
        this.sourceFieldMappingClient =
            sourceFieldMappingClient;
        if (
            !rowBuilder ||
            typeof rowBuilder.build !== "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires rowBuilder"
            );
        }

        this.sourceResidentMappingClient =
            sourceResidentMappingClient;

        if (
            !sourceRecordIdentityMappingClient ||
            typeof sourceRecordIdentityMappingClient.get !==
                "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires sourceRecordIdentityMappingClient"
            );
        }

        this.sourceRecordIdentityMappingClient =
            sourceRecordIdentityMappingClient;

        if (
            !semanticRecordPreviewClient ||
            typeof semanticRecordPreviewClient.lookup !==
                "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires semanticRecordPreviewClient"
            );
        }

        this.semanticRecordPreviewClient =
            semanticRecordPreviewClient;
        this.rowBuilder =
            rowBuilder;

        if (
            !previewComparator ||
            typeof previewComparator.compare !==
                "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires previewComparator"
            );
        }

        this.previewComparator =
            previewComparator;

        if (
            !canonicalizer ||
            typeof canonicalizer.process !==
                "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires canonicalizer"
            );
        }

        this.canonicalizer =
            canonicalizer;

        if (
            !previewFingerprint ||
            typeof previewFingerprint.create !==
                "function"
        ) {
            throw new Error(
                "LocalImportPreviewService requires previewFingerprint"
            );
        }

        this.previewFingerprint =
            previewFingerprint;
    }

    async preview({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const result =
            await this.buildPreview({
                sourceDocumentKey,
                sourceUpdatedAt,
                sourceSize,
                includeExecutionPlan: false
            });

        return result;
    }

    async buildExecutionPlan({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        return this.buildPreview({
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize,
            includeExecutionPlan: true
        });
    }

    async buildPreview({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        includeExecutionPlan = false
    } = {}) {
        const snapshot =
            await this.localConnectorService.resolveSourceSnapshot({
                sourceDocumentKey,
                sourceUpdatedAt,
                sourceSize
            });

        const [
            fieldMappingResult,
            residentMappingResult,
            sourceRecordIdentityMappingResult
        ] = await Promise.all([
            this.sourceFieldMappingClient.list(
                snapshot.sourceDocumentKey,
                snapshot.sourceUpdatedAt,
                snapshot.sourceSize
            ),
            this.sourceResidentMappingClient.list({
                sourceDocumentKey:
                    snapshot.sourceDocumentKey,
                sourceUpdatedAt:
                    snapshot.sourceUpdatedAt,
                sourceSize:
                    snapshot.sourceSize
            }),
            this.sourceRecordIdentityMappingClient.get({
                sourceDocumentKey:
                    snapshot.sourceDocumentKey,
                sourceUpdatedAt:
                    snapshot.sourceUpdatedAt,
                sourceSize:
                    snapshot.sourceSize
            })
        ]);

        if (
            fieldMappingResult?.status !== "found" ||
            !Array.isArray(fieldMappingResult.mappings)
        ) {
            throw new Error(
                "Source field mappings are unavailable"
            );
        }

        if (
            residentMappingResult?.status !== "found" ||
            !Array.isArray(residentMappingResult.mappings)
        ) {
            throw new Error(
                "Source resident mappings are unavailable"
            );
        }

        if (
            sourceRecordIdentityMappingResult?.status !==
                "found" ||
            !sourceRecordIdentityMappingResult.mapping ||
            typeof sourceRecordIdentityMappingResult
                .mapping.sourceFieldKey !== "string" ||
            !sourceRecordIdentityMappingResult
                .mapping.sourceFieldKey.trim()
        ) {
            return {
                status: "blocked",
                blockReason:
                    "source_record_identity_mapping_unavailable",
                sourceEntityCount:
                    Array.isArray(
                        snapshot.analysis?.extracted
                            ?.sourceEntities
                    )
                        ? snapshot.analysis.extracted
                            .sourceEntities.length
                        : 0,
                readySourceEntityCount: 0,
                unresolvedResidentCount: 0,
                missingResidentNameCount: 0,
                readyRowCount: 0,
                invalidRowCount: 0,
                invalidReasons: {
                    source_record_identity_mapping_unavailable:
                        1
                },
                confirmedFieldMappingCount:
                    fieldMappingResult.mappings.length,
                sample: []
            };
        }

        const sourceRecordIdentityFieldKey =
            sourceRecordIdentityMappingResult
                .mapping.sourceFieldKey.trim();

        const sourceEntities =
            snapshot.analysis?.extracted?.sourceEntities;

        if (!Array.isArray(sourceEntities)) {
            throw new Error(
                "Source entities are unavailable"
            );
        }

        const fieldMappings =
            fieldMappingResult.mappings.filter(mapping =>
                mapping &&
                typeof mapping.sourceFieldKey === "string" &&
                mapping.sourceFieldKey.trim() &&
                typeof mapping.standardEntityName === "string" &&
                mapping.standardEntityName.trim() &&
                typeof mapping.standardFieldName === "string" &&
                mapping.standardFieldName.trim()
            );

        const findUserMapping =
            standardFieldName =>
                fieldMappings.filter(
                    mapping =>
                        mapping.standardEntityName === "user" &&
                        mapping.standardFieldName === standardFieldName
                );

        const userCodeMappings =
            findUserMapping("user_code");

        const nameMappings =
            findUserMapping("name");

        let identifierType;
        let identifierFieldMapping;

        if (userCodeMappings.length === 1) {
            identifierType = "user_code";
            identifierFieldMapping =
                userCodeMappings[0];
        } else if (
            userCodeMappings.length === 0 &&
            nameMappings.length === 1
        ) {
            identifierType = "name";
            identifierFieldMapping =
                nameMappings[0];
        } else {
            const error =
                new Error(
                    "Resident identifier mapping is unavailable"
                );
            error.code =
                "resident_identifier_mapping_unavailable";
            throw error;
        }

        if (nameMappings.length !== 1) {
            return {
                status: "blocked",
                sourceEntityCount:
                    sourceEntities.length,
                readySourceEntityCount: 0,
                unresolvedResidentCount: 0,
                missingResidentNameCount:
                    sourceEntities.length,
                confirmedFieldMappingCount:
                    fieldMappings.length,
                sample: []
            };
        }

        const residentMappingIndex =
            new Map(
                residentMappingResult.mappings.map(
                    mapping => [
                        `${mapping.identifierType}:${mapping.identifierDigest}`,
                        mapping
                    ]
                )
            );

        const identifierSourceFieldKey =
            identifierFieldMapping.sourceFieldKey.trim();

        const nameSourceFieldKey =
            nameMappings[0].sourceFieldKey.trim();

        let readySourceEntityCount = 0;
        let unresolvedResidentCount = 0;
        let missingResidentNameCount = 0;
        let readyRowCount = 0;
        let invalidRowCount = 0;

        const invalidReasons = {};
        const sample = [];
        const readySourceRecordKeys = [];
        const readyRowsBySourceRecordKey =
            new Map();

        for (const entity of sourceEntities) {
            const sourceEntityKey =
                typeof entity?.sourceEntityKey === "string"
                    ? entity.sourceEntityKey.trim()
                    : "";

            const values =
                entity?.valuesBySourceFieldKey &&
                typeof entity.valuesBySourceFieldKey === "object" &&
                !Array.isArray(
                    entity.valuesBySourceFieldKey
                )
                    ? entity.valuesBySourceFieldKey
                    : {};

            const residentName =
                typeof values[nameSourceFieldKey] === "string"
                    ? values[nameSourceFieldKey].trim()
                    : "";

            if (!residentName) {
                missingResidentNameCount += 1;
                continue;
            }

            const identifierValue =
                typeof values[
                    identifierSourceFieldKey
                ] === "string"
                    ? values[
                        identifierSourceFieldKey
                    ].trim()
                    : "";

            if (!identifierValue) {
                unresolvedResidentCount += 1;
                continue;
            }

            const identifierDigest =
                crypto
                    .createHash("sha256")
                    .update(identifierValue, "utf8")
                    .digest("hex");

            const residentMapping =
                residentMappingIndex.get(
                    `${identifierType}:${identifierDigest}`
                );

            if (
                !residentMapping ||
                residentMapping.mappingStatus !== "confirmed" ||
                typeof residentMapping.residentId !== "string" ||
                !residentMapping.residentId.trim()
            ) {
                unresolvedResidentCount += 1;
                continue;
            }

            readySourceEntityCount += 1;

            const rowResult =
                this.rowBuilder.build({
                    sourceEntity: entity,
                    fieldMappings,
                    residentId:
                        residentMapping.residentId,
                    sourceRecordIdentityFieldKey
                });

            if (rowResult.status !== "ready") {
                invalidRowCount += 1;

                const errorCode =
                    typeof rowResult.errorCode === "string" &&
                    rowResult.errorCode.trim()
                        ? rowResult.errorCode.trim()
                        : "row_invalid";

                invalidReasons[errorCode] =
                    (invalidReasons[errorCode] || 0) + 1;

                continue;
            }

            readyRowCount += 1;
            readySourceRecordKeys.push(
                rowResult.sourceRecordKey
            );
            readyRowsBySourceRecordKey.set(
                rowResult.sourceRecordKey,
                {
                    residentId:
                        residentMapping.residentId.trim(),
                    fields:
                        rowResult.fields
                }
            );

            if (sample.length < 10) {
                sample.push({
                    sourceEntityKey,
                    residentName,
                    sourceRecordKey:
                        rowResult.sourceRecordKey,
                    fields:
                        rowResult.fields
                });
            }
        }

        const duplicateSourceRecordKeyCount =
            readySourceRecordKeys.length -
            new Set(readySourceRecordKeys).size;

        if (duplicateSourceRecordKeyCount > 0) {
            invalidReasons.source_record_identity_duplicate =
                duplicateSourceRecordKeyCount;
            invalidRowCount +=
                duplicateSourceRecordKeyCount;
        }

        let existingRecordCount = 0;
        let newRecordCount = 0;
        let unchangedRecordCount = 0;
        let updateCandidateCount = 0;
        let reviewRequiredCount = 0;
        let semanticPreviewBatchCount = 0;
        const previewFingerprintEntries = [];
        const executionPlanEntries = [];

        if (
            readySourceRecordKeys.length > 0 &&
            duplicateSourceRecordKeyCount === 0
        ) {
            const existingRecordsBySourceRecordKey =
                new Map();

            const semanticPreviewBatches = [];

            for (
                let offset = 0;
                offset < readySourceRecordKeys.length;
                offset += 500
            ) {
                semanticPreviewBatches.push(
                    readySourceRecordKeys.slice(
                        offset,
                        offset + 500
                    )
                );
            }

            semanticPreviewBatchCount =
                semanticPreviewBatches.length;

            for (
                let offset = 0;
                offset < semanticPreviewBatches.length;
                offset += 6
            ) {
                const batchWindow =
                    semanticPreviewBatches.slice(
                        offset,
                        offset + 6
                    );

                const windowResults =
                    await Promise.all(
                        batchWindow.map(batch =>
                            this.semanticRecordPreviewClient.lookup({
                                sourceDocumentKey:
                                    snapshot.sourceDocumentKey,
                                sourceRecordKeys:
                                    batch
                            })
                        )
                    );

                for (const lookupResult of windowResults) {
                    if (
                        lookupResult?.status !== "found" ||
                        !Array.isArray(
                            lookupResult.records
                        )
                    ) {
                        throw new Error(
                            "Semantic record preview is unavailable"
                        );
                    }

                    for (const record of lookupResult.records) {
                        const key =
                            typeof record?.sourceRecordKey ===
                                "string"
                                ? record.sourceRecordKey.trim()
                                : "";

                        if (!key) {
                            throw new Error(
                                "Semantic record preview returned invalid record"
                            );
                        }

                        if (
                            existingRecordsBySourceRecordKey.has(
                                key
                            )
                        ) {
                            throw new Error(
                                "Semantic record preview returned duplicate record"
                            );
                        }

                        existingRecordsBySourceRecordKey.set(
                            key,
                            record
                        );
                    }
                }
            }

            existingRecordCount =
                existingRecordsBySourceRecordKey.size;

            for (
                const sourceRecordKey of
                    readySourceRecordKeys
            ) {
                const readyRow =
                    readyRowsBySourceRecordKey.get(
                        sourceRecordKey
                    );

                const sourceRow =
                    readyRow.fields;

                const existingRecord =
                    existingRecordsBySourceRecordKey.get(
                        sourceRecordKey
                    ) || null;

                const comparison =
                    this.previewComparator.compare({
                        sourceRow,
                        existingRecord
                    });

                if (
                    comparison.status === "new" ||
                    comparison.status === "unchanged" ||
                    comparison.status === "update"
                ) {
                    let canonical;

                    try {
                        canonical =
                            this.canonicalizer.process(
                                comparison.mergedFields
                            );

                        if (
                            !canonical ||
                            typeof canonical.contentHash !==
                                "string" ||
                            !/^[0-9a-f]{64}$/.test(
                                canonical.contentHash
                            ) ||
                            canonical.canonicalizationVersion !==
                                "risen-semantic-canonicalization-2"
                        ) {
                            throw new Error(
                                "Canonicalization result is invalid"
                            );
                        }
                    } catch {
                        invalidRowCount += 1;

                        invalidReasons
                            .semantic_canonicalization_invalid =
                            (
                                invalidReasons
                                    .semantic_canonicalization_invalid ||
                                0
                            ) + 1;

                        continue;
                    }

                    if (comparison.status === "new") {
                        const planEntry = {
                            sourceRecordKey,
                            residentId:
                                readyRow.residentId,
                            action: "new",
                            recordId: null,
                            baselineHash: null,
                            targetHash:
                                canonical.contentHash,
                            targetSemanticContent:
                                canonical.semanticContent,
                            canonicalizationVersion:
                                canonical.canonicalizationVersion
                        };

                        executionPlanEntries.push(
                            planEntry
                        );

                        previewFingerprintEntries.push({
                            sourceRecordKey:
                                planEntry.sourceRecordKey,
                            residentId:
                                planEntry.residentId,
                            action:
                                planEntry.action,
                            recordId:
                                planEntry.recordId,
                            baselineHash:
                                planEntry.baselineHash,
                            targetHash:
                                planEntry.targetHash
                        });

                        newRecordCount += 1;
                        continue;
                    }

                    if (
                        comparison.status ===
                        "unchanged"
                    ) {
                        if (
                            !existingRecord ||
                            typeof existingRecord.contentHash !==
                                "string" ||
                            canonical.contentHash !==
                                existingRecord.contentHash
                        ) {
                            invalidRowCount += 1;

                            invalidReasons
                                .existing_content_hash_mismatch =
                                (
                                    invalidReasons
                                        .existing_content_hash_mismatch ||
                                    0
                                ) + 1;

                            continue;
                        }

                        const planEntry = {
                            sourceRecordKey,
                            residentId:
                                readyRow.residentId,
                            action: "unchanged",
                            recordId:
                                existingRecord.recordId.trim(),
                            baselineHash:
                                existingRecord.contentHash,
                            targetHash:
                                canonical.contentHash,
                            targetSemanticContent:
                                canonical.semanticContent,
                            canonicalizationVersion:
                                canonical.canonicalizationVersion
                        };

                        executionPlanEntries.push(
                            planEntry
                        );

                        previewFingerprintEntries.push({
                            sourceRecordKey:
                                planEntry.sourceRecordKey,
                            residentId:
                                planEntry.residentId,
                            action:
                                planEntry.action,
                            recordId:
                                planEntry.recordId,
                            baselineHash:
                                planEntry.baselineHash,
                            targetHash:
                                planEntry.targetHash
                        });

                        unchangedRecordCount += 1;
                        continue;
                    }

                    if (
                        !existingRecord ||
                        typeof existingRecord.recordId !==
                            "string" ||
                        !existingRecord.recordId.trim() ||
                        typeof existingRecord.contentHash !==
                            "string" ||
                        !/^[0-9a-f]{64}$/.test(
                            existingRecord.contentHash
                        )
                    ) {
                        invalidRowCount += 1;

                        invalidReasons
                            .semantic_preview_update_baseline_invalid =
                            (
                                invalidReasons
                                    .semantic_preview_update_baseline_invalid ||
                                0
                            ) + 1;

                        continue;
                    }

                    let existingCanonical;

                    try {
                        if (
                            !existingRecord.semanticContent ||
                            existingRecord.semanticContent
                                .semanticType !==
                                "support_record" ||
                            !existingRecord.semanticContent
                                .fields ||
                            typeof existingRecord.semanticContent
                                .fields !== "object" ||
                            Array.isArray(
                                existingRecord.semanticContent
                                    .fields
                            )
                        ) {
                            throw new Error(
                                "Existing semantic content is invalid"
                            );
                        }

                        existingCanonical =
                            this.canonicalizer.process(
                                existingRecord.semanticContent
                                    .fields
                            );

                        if (
                            !existingCanonical ||
                            existingCanonical.contentHash !==
                                existingRecord.contentHash ||
                            existingCanonical
                                .canonicalizationVersion !==
                                "risen-semantic-canonicalization-2"
                        ) {
                            throw new Error(
                                "Existing semantic content hash mismatch"
                            );
                        }
                    } catch {
                        invalidRowCount += 1;

                        invalidReasons
                            .existing_content_hash_mismatch =
                            (
                                invalidReasons
                                    .existing_content_hash_mismatch ||
                                0
                            ) + 1;

                        continue;
                    }

                    const planEntry = {
                        sourceRecordKey,
                        residentId:
                            readyRow.residentId,
                        action: "update",
                        recordId:
                            existingRecord.recordId.trim(),
                        baselineHash:
                            existingRecord.contentHash,
                        targetHash:
                            canonical.contentHash,
                        targetSemanticContent:
                            canonical.semanticContent,
                        canonicalizationVersion:
                            canonical.canonicalizationVersion
                    };

                    executionPlanEntries.push(
                        planEntry
                    );

                    previewFingerprintEntries.push({
                        sourceRecordKey:
                            planEntry.sourceRecordKey,
                        residentId:
                            planEntry.residentId,
                        action:
                            planEntry.action,
                        recordId:
                            planEntry.recordId,
                        baselineHash:
                            planEntry.baselineHash,
                        targetHash:
                            planEntry.targetHash
                    });

                    updateCandidateCount += 1;
                    continue;
                }

                if (
                    comparison.status ===
                    "review"
                ) {
                    reviewRequiredCount += 1;
                    continue;
                }

                invalidRowCount += 1;

                const reason =
                    typeof comparison.reason ===
                        "string" &&
                    comparison.reason.trim()
                        ? comparison.reason.trim()
                        : "semantic_preview_invalid";

                invalidReasons[reason] =
                    (invalidReasons[reason] || 0) + 1;
            }
        }

        const status =
            sourceEntities.length > 0 &&
            readySourceEntityCount ===
                sourceEntities.length &&
            unresolvedResidentCount === 0 &&
            missingResidentNameCount === 0 &&
            readyRowCount === sourceEntities.length &&
            invalidRowCount === 0 &&
            duplicateSourceRecordKeyCount === 0 &&
            reviewRequiredCount === 0
                ? "ready"
                : "blocked";

        let previewFingerprintValue = null;

        if (status === "ready") {
            if (
                previewFingerprintEntries.length !==
                    readyRowCount
            ) {
                throw new Error(
                    "Preview fingerprint plan is incomplete"
                );
            }

            previewFingerprintValue =
                this.previewFingerprint.create(
                    previewFingerprintEntries
                );

            if (
                executionPlanEntries.length !==
                    readyRowCount
            ) {
                throw new Error(
                    "Execution plan is incomplete"
                );
            }
        }

        return {
            status,
            previewFingerprint:
                previewFingerprintValue,
            ...(includeExecutionPlan
                ? {
                    executionPlan:
                        status === "ready"
                            ? executionPlanEntries
                            : null
                }
                : {}),
            sourceEntityCount:
                sourceEntities.length,
            readySourceEntityCount,
            unresolvedResidentCount,
            missingResidentNameCount,
            readyRowCount,
            invalidRowCount,
            invalidReasons,
            existingRecordCount,
            newRecordCount,
            unchangedRecordCount,
            updateCandidateCount,
            reviewRequiredCount,
            semanticPreviewBatchCount,
            duplicateSourceRecordKeyCount,
            confirmedFieldMappingCount:
                fieldMappings.length,
            sample
        };
    }
}

module.exports =
    LocalImportPreviewService;
