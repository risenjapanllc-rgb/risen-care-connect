"use strict";

const crypto = require("node:crypto");

class SourceResidentCandidateResolver {
    constructor({
        localConnectorService,
        sourceFieldMappingClient,
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

        const findIdentifierMappings =
            standardFieldName =>
                mappingResult.mappings.filter(
                    mapping =>
                        mapping &&
                        mapping.standardEntityName ===
                            "user" &&
                        mapping.standardFieldName ===
                            standardFieldName &&
                        typeof mapping.sourceFieldKey ===
                            "string" &&
                        mapping.sourceFieldKey.trim() !==
                            ""
                );

        const userCodeMappings =
            findIdentifierMappings("user_code");

        const nameMappings =
            findIdentifierMappings("name");

        let identifierType;
        let candidateIdentifierType;
        let identifierMapping;

        if (userCodeMappings.length === 1) {
            identifierType = "user_code";
            candidateIdentifierType = "userCode";
            identifierMapping =
                userCodeMappings[0];
        } else if (
            userCodeMappings.length === 0 &&
            nameMappings.length === 1
        ) {
            identifierType = "name";
            candidateIdentifierType = "name";
            identifierMapping =
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

        const sourceFieldKey =
            identifierMapping.sourceFieldKey.trim();

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
                    sourceEntityCount: 0
                };
                grouped.set(
                    identifierValue,
                    group
                );
            }

            group.sourceEntityCount += 1;
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
                status:
                    candidates.length === 0
                        ? "not_found"
                        : candidates.length === 1
                            ? "matched"
                            : "ambiguous",
                candidates
            });
        }

        return {
            identifierType,
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

        const findIdentifierMappings =
            standardFieldName =>
                mappingResult.mappings.filter(
                    mapping =>
                        mapping &&
                        mapping.standardEntityName ===
                            "user" &&
                        mapping.standardFieldName ===
                            standardFieldName &&
                        typeof mapping.sourceFieldKey ===
                            "string" &&
                        mapping.sourceFieldKey.trim() !==
                            ""
                );

        const userCodeMappings =
            findIdentifierMappings("user_code");

        const nameMappings =
            findIdentifierMappings("name");

        let identifierType;
        let identifierMapping;

        if (userCodeMappings.length === 1) {
            identifierType = "userCode";
            identifierMapping =
                userCodeMappings[0];
        } else if (
            userCodeMappings.length === 0 &&
            nameMappings.length === 1
        ) {
            identifierType = "name";
            identifierMapping =
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

        const sourceFieldKey =
            identifierMapping.sourceFieldKey.trim();

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
                    [identifierType]:
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
