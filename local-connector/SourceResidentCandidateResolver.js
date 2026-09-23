"use strict";

const crypto = require("node:crypto");
const { resolveResidentIdentityMapping } =
    require("./ResidentIdentityMappingResolver");
const { resolveHumanConfirmedFieldMappings } =
    require("./HumanConfirmedFieldMappingResolver");

class SourceResidentCandidateResolver {
    constructor({
        localConnectorService,
        sourceFieldMappingClient,
        sourceFieldInterpretationClient,
        residentCandidateClient
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService
                .resolveSourceSnapshot !== "function"
        ) {
            throw new Error(
                "SourceResidentCandidateResolver requires localConnectorService"
            );
        }

        if (
            !sourceFieldMappingClient ||
            typeof sourceFieldMappingClient.list !==
                "function"
        ) {
            throw new Error(
                "SourceResidentCandidateResolver requires sourceFieldMappingClient"
            );
        }

        if (
            !sourceFieldInterpretationClient ||
            typeof sourceFieldInterpretationClient.list !==
                "function"
        ) {
            throw new Error(
                "SourceResidentCandidateResolver requires sourceFieldInterpretationClient"
            );
        }

        if (
            !residentCandidateClient ||
            typeof residentCandidateClient
                .findCandidates !== "function"
        ) {
            throw new Error(
                "SourceResidentCandidateResolver requires residentCandidateClient"
            );
        }

        this.localConnectorService =
            localConnectorService;
        this.sourceFieldMappingClient =
            sourceFieldMappingClient;
        this.sourceFieldInterpretationClient =
            sourceFieldInterpretationClient;
        this.residentCandidateClient =
            residentCandidateClient;
    }

    async findCandidateGroups({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        const snapshot =
            await this.localConnectorService
                .resolveSourceSnapshot({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

        const mappingResult =
            await this.sourceFieldMappingClient
                .list(
                    snapshot.sourceDocumentKey,
                    snapshot.sourceUpdatedAt,
                    snapshot.sourceSize
                );

        if (
            mappingResult?.status !== "found" ||
            !Array.isArray(mappingResult.mappings)
        ) {
            const error =
                new Error(
                    "Source field mappings are unavailable"
                );
            error.code =
                "resident_identifier_mapping_unavailable";
            throw error;
        }

        const interpretationResult =
            await this.sourceFieldInterpretationClient
                .list({
                    sourceDocumentKey:
                        snapshot.sourceDocumentKey,
                    sourceUpdatedAt:
                        snapshot.sourceUpdatedAt,
                    sourceSize:
                        snapshot.sourceSize
                });

        if (
            interpretationResult?.status !== "found" ||
            !Array.isArray(
                interpretationResult.interpretations
            )
        ) {
            const error =
                new Error(
                    "Source field interpretations are unavailable"
                );
            error.code =
                "resident_identifier_mapping_unavailable";
            throw error;
        }

        const {
            humanConfirmedMeanings,
            humanConfirmedMappings
        } =
            resolveHumanConfirmedFieldMappings(
                mappingResult.mappings,
                interpretationResult.interpretations
            );

        let resolvedIdentityMapping;

        try {
            resolvedIdentityMapping =
                resolveResidentIdentityMapping(
                    humanConfirmedMappings
                );
        } catch (error) {
            if (
                error?.code ===
                "resident_identifier_mapping_unavailable"
            ) {
                const hasResidentMapping =
                    mappingResult.mappings.some(
                        mapping =>
                            mapping &&
                            mapping.standardEntityName ===
                                "user" &&
                            [
                                "name",
                                "user_code"
                            ].includes(
                                mapping.standardFieldName
                            )
                    );

                const hasHumanConfirmedInterpretation =
                    humanConfirmedMeanings.size > 0;

                const hasMatchingHumanConfirmedMapping =
                    humanConfirmedMappings.length > 0;

                error.identityReason =
                    !hasResidentMapping
                        ? "resident_mapping_missing"
                        : !hasHumanConfirmedInterpretation
                            ? "human_confirmation_missing"
                            : !hasMatchingHumanConfirmedMapping
                                ? "confirmed_meaning_mismatch"
                                : "resident_identity_mapping_ambiguous";
            }

            throw error;
        }

        const {
            identifierType,
            candidateIdentifierType,
            sourceFieldKey
        } = resolvedIdentityMapping;

        const identifierMapping =
            mappingResult.mappings.find(
                mapping =>
                    mapping &&
                    typeof mapping.sourceFieldKey === "string" &&
                    mapping.sourceFieldKey.trim() ===
                        sourceFieldKey
            );

        const fieldDefinitions =
            Array.isArray(
                snapshot.analysis?.extracted
                    ?.fieldDefinitions
            )
                ? snapshot.analysis.extracted
                    .fieldDefinitions
                : [];

        const identifierFieldDefinition =
            fieldDefinitions.find(
                field =>
                    field &&
                    typeof field.sourceFieldKey === "string" &&
                    field.sourceFieldKey.trim() ===
                        sourceFieldKey
            );

        const persistedHeaderLabel =
            typeof identifierMapping?.headerLabel === "string"
                ? identifierMapping.headerLabel.trim()
                : "";

        const structuralHeaderLabel =
            typeof identifierFieldDefinition?.headerLabel === "string"
                ? identifierFieldDefinition.headerLabel.trim()
                : "";

        const identifierHeaderLabel =
            persistedHeaderLabel ||
            structuralHeaderLabel ||
            null;

        const sourceEntities =
            snapshot.analysis?.extracted
                ?.sourceEntities;

        if (!Array.isArray(sourceEntities)) {
            const error =
                new Error(
                    "Source entities are unavailable"
                );
            error.code =
                "source_entities_unavailable";
            throw error;
        }

        const grouped =
            new Map();

        let unavailableSourceEntityCount = 0;

        for (const entity of sourceEntities) {
            const rawIdentifier =
                entity?.valuesBySourceFieldKey?.[
                    sourceFieldKey
                ];

            const identifierValue =
                typeof rawIdentifier === "string"
                    ? rawIdentifier.trim()
                    : "";

            if (!identifierValue) {
                unavailableSourceEntityCount += 1;
                continue;
            }

            let group =
                grouped.get(identifierValue);

            if (!group) {
                group = {
                    identifierValue,
                    sourceEntityCount: 0,
                    sourceEntityKeys: []
                };
                grouped.set(
                    identifierValue,
                    group
                );
            }

            group.sourceEntityCount += 1;

            if (
                typeof entity?.sourceEntityKey !== "string" ||
                !entity.sourceEntityKey.trim()
            ) {
                const error =
                    new Error(
                        "Source entity key is unavailable"
                    );
                error.code =
                    "source_entities_unavailable";
                throw error;
            }

            group.sourceEntityKeys.push(
                entity.sourceEntityKey.trim()
            );
        }

        const groups = [];

        for (const group of grouped.values()) {
            const candidates =
                await this.residentCandidateClient
                    .findCandidates({
                        [candidateIdentifierType]:
                            group.identifierValue
                    });

            if (!Array.isArray(candidates)) {
                const error =
                    new Error(
                        "Resident candidates are invalid"
                    );
                error.code =
                    "resident_candidate_response_invalid";
                throw error;
            }

            const identifierDigest =
                crypto
                    .createHash("sha256")
                    .update(
                        group.identifierValue,
                        "utf8"
                    )
                    .digest("hex");

            groups.push({
                identifierType,
                identifierDigest,
                identifierValue:
                    identifierType === "name"
                        ? group.identifierValue
                        : null,
                sourceEntityCount:
                    group.sourceEntityCount,
                sourceEntityKeys:
                    [...group.sourceEntityKeys],
                status:
                    candidates.length === 0
                        ? "not_found"
                        : candidates.length === 1
                            ? "matched"
                            : "ambiguous",
                candidates
            });
        }

        const identifierFieldDefinitionMatched =
            Boolean(identifierFieldDefinition);

        const identifierMappingHasHeaderLabel =
            Boolean(persistedHeaderLabel);

        const identifierKeyPresentInEverySourceEntity =
            sourceEntities.every(
                entity =>
                    entity &&
                    entity.valuesBySourceFieldKey &&
                    typeof entity.valuesBySourceFieldKey === "object" &&
                    Object.prototype.hasOwnProperty.call(
                        entity.valuesBySourceFieldKey,
                        sourceFieldKey
                    )
            );

        return {
            identifierType,
            identifierHeaderLabel,
            identityDiagnostic: {
                fieldDefinitionMatched:
                    identifierFieldDefinitionMatched,
                mappingHasHeaderLabel:
                    identifierMappingHasHeaderLabel,
                keyPresentInEverySourceEntity:
                    identifierKeyPresentInEverySourceEntity,
                fieldDefinitionCount:
                    fieldDefinitions.length
            },
            sourceEntityCount:
                sourceEntities.length,
            unavailableSourceEntityCount,
            groups
        };
    }

    async findCandidates({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        sourceEntityKey
    } = {}) {
        if (
            typeof sourceEntityKey !== "string" ||
            sourceEntityKey.trim() === ""
        ) {
            const error =
                new TypeError(
                    "sourceEntityKey is required"
                );
            error.code =
                "source_entity_invalid";
            throw error;
        }

        const snapshot =
            await this.localConnectorService
                .resolveSourceSnapshot({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

        const mappingResult =
            await this.sourceFieldMappingClient
                .list(
                    snapshot.sourceDocumentKey,
                    snapshot.sourceUpdatedAt,
                    snapshot.sourceSize
                );

        if (
            mappingResult?.status !== "found" ||
            !Array.isArray(
                mappingResult.mappings
            )
        ) {
            const error =
                new Error(
                    "Source field mappings are unavailable"
                );
            error.code =
                "resident_identifier_mapping_unavailable";
            throw error;
        }

        const interpretationResult =
            await this.sourceFieldInterpretationClient
                .list({
                    sourceDocumentKey:
                        snapshot.sourceDocumentKey,
                    sourceUpdatedAt:
                        snapshot.sourceUpdatedAt,
                    sourceSize:
                        snapshot.sourceSize
                });

        if (
            interpretationResult?.status !== "found" ||
            !Array.isArray(
                interpretationResult.interpretations
            )
        ) {
            const error =
                new Error(
                    "Source field interpretations are unavailable"
                );
            error.code =
                "resident_identifier_mapping_unavailable";
            throw error;
        }

        const humanConfirmedMeanings =
            new Map(
                interpretationResult.interpretations
                    .filter(
                        interpretation =>
                            interpretation &&
                            interpretation.confirmedByHuman === true &&
                            typeof interpretation.sourceFieldKey === "string" &&
                            interpretation.sourceFieldKey.trim() &&
                            typeof interpretation.confirmedMeaning === "string" &&
                            interpretation.confirmedMeaning.trim()
                    )
                    .map(
                        interpretation => [
                            interpretation.sourceFieldKey.trim(),
                            interpretation.confirmedMeaning.trim()
                        ]
                    )
            );

        const humanConfirmedMappings =
            mappingResult.mappings.filter(
                mapping => {
                    if (
                        !mapping ||
                        typeof mapping.sourceFieldKey !== "string" ||
                        typeof mapping.standardEntityName !== "string" ||
                        typeof mapping.standardFieldName !== "string"
                    ) {
                        return false;
                    }

                    const sourceFieldKey =
                        mapping.sourceFieldKey.trim();

                    const expectedMeaning =
                        mapping.standardEntityName.trim() +
                        "." +
                        mapping.standardFieldName.trim();

                    return (
                        humanConfirmedMeanings.get(
                            sourceFieldKey
                        ) === expectedMeaning
                    );
                }
            );

        let resolvedIdentityMapping;

        try {
            resolvedIdentityMapping =
                resolveResidentIdentityMapping(
                    humanConfirmedMappings
                );
        } catch (error) {
            if (
                error?.code ===
                "resident_identifier_mapping_unavailable"
            ) {
                const hasResidentMapping =
                    mappingResult.mappings.some(
                        mapping =>
                            mapping &&
                            mapping.standardEntityName ===
                                "user" &&
                            [
                                "name",
                                "user_code"
                            ].includes(
                                mapping.standardFieldName
                            )
                    );

                const hasHumanConfirmedInterpretation =
                    humanConfirmedMeanings.size > 0;

                const hasMatchingHumanConfirmedMapping =
                    humanConfirmedMappings.length > 0;

                error.identityReason =
                    !hasResidentMapping
                        ? "resident_mapping_missing"
                        : !hasHumanConfirmedInterpretation
                            ? "human_confirmation_missing"
                            : !hasMatchingHumanConfirmedMapping
                                ? "confirmed_meaning_mismatch"
                                : "resident_identity_mapping_ambiguous";
            }

            throw error;
        }

        const {
            identifierType,
            candidateIdentifierType,
            sourceFieldKey
        } = resolvedIdentityMapping;

        const identifierMapping =
            mappingResult.mappings.find(
                mapping =>
                    mapping &&
                    typeof mapping.sourceFieldKey === "string" &&
                    mapping.sourceFieldKey.trim() ===
                        sourceFieldKey
            );

        const fieldDefinitions =
            Array.isArray(
                snapshot.analysis?.extracted
                    ?.fieldDefinitions
            )
                ? snapshot.analysis.extracted
                    .fieldDefinitions
                : [];

        const identifierFieldDefinition =
            fieldDefinitions.find(
                field =>
                    field &&
                    typeof field.sourceFieldKey === "string" &&
                    field.sourceFieldKey.trim() ===
                        sourceFieldKey
            );

        const persistedHeaderLabel =
            typeof identifierMapping?.headerLabel === "string"
                ? identifierMapping.headerLabel.trim()
                : "";

        const structuralHeaderLabel =
            typeof identifierFieldDefinition?.headerLabel === "string"
                ? identifierFieldDefinition.headerLabel.trim()
                : "";

        const identifierHeaderLabel =
            persistedHeaderLabel ||
            structuralHeaderLabel ||
            null;

        const sourceEntities =
            snapshot.analysis?.extracted
                ?.sourceEntities;

        if (!Array.isArray(sourceEntities)) {
            const error =
                new Error(
                    "Source entities are unavailable"
                );
            error.code =
                "source_entities_unavailable";
            throw error;
        }

        const sourceEntity =
            sourceEntities.find(
                entity =>
                    entity &&
                    entity.sourceEntityKey ===
                        sourceEntityKey.trim()
            );

        if (!sourceEntity) {
            const error =
                new Error(
                    "Source entity was not found"
                );
            error.code =
                "source_entity_not_found";
            throw error;
        }

        const rawIdentifier =
            sourceEntity
                .valuesBySourceFieldKey?.[
                    sourceFieldKey
                ];

        const identifierValue =
            typeof rawIdentifier === "string"
                ? rawIdentifier.trim()
                : "";

        if (!identifierValue) {
            const error =
                new Error(
                    "Resident identifier is unavailable"
                );
            error.code =
                "resident_identifier_unavailable";
            throw error;
        }

        const candidates =
            await this.residentCandidateClient
                .findCandidates({
                [candidateIdentifierType]:
                    identifierValue
            });

        if (!Array.isArray(candidates)) {
            const error =
                new Error(
                    "Resident candidates are invalid"
                );
            error.code =
                "resident_candidate_response_invalid";
            throw error;
        }

        return {
            status:
                candidates.length === 0
                    ? "not_found"
                    : candidates.length === 1
                        ? "matched"
                        : "ambiguous",
            candidates
        };
    }
}

module.exports =
    SourceResidentCandidateResolver;
