"use strict";

class SourceTemplateAuthorityFieldMappingService {
    constructor({
        semanticRegistrationClient,
        sourceFieldMappingClient,
        sourceFieldInterpretationClient
    } = {}) {
        if (
            !semanticRegistrationClient ||
            typeof semanticRegistrationClient.listAuthority !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateAuthorityFieldMappingService requires semanticRegistrationClient"
            );
        }

        if (
            !sourceFieldMappingClient ||
            typeof sourceFieldMappingClient.ingest !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateAuthorityFieldMappingService requires sourceFieldMappingClient"
            );
        }

        this.semanticRegistrationClient =
            semanticRegistrationClient;

        if (
            !sourceFieldInterpretationClient ||
            typeof sourceFieldInterpretationClient.ingest !==
                "function"
        ) {
            throw new Error(
                "SourceTemplateAuthorityFieldMappingService requires sourceFieldInterpretationClient"
            );
        }

        this.sourceFieldMappingClient =
            sourceFieldMappingClient;

        this.sourceFieldInterpretationClient =
            sourceFieldInterpretationClient;
    }

    async apply({
        templateId,
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        fieldDefinitions
    } = {}) {
        if (
            typeof templateId !== "string" ||
            !templateId.trim()
        ) {
            throw new TypeError(
                "templateId is required"
            );
        }

        if (
            typeof sourceDocumentKey !== "string" ||
            !sourceDocumentKey.trim()
        ) {
            throw new TypeError(
                "sourceDocumentKey is required"
            );
        }

        if (
            typeof sourceUpdatedAt !== "string" ||
            !sourceUpdatedAt.trim() ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            )
        ) {
            throw new TypeError(
                "sourceUpdatedAt is required"
            );
        }

        if (
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            throw new TypeError(
                "sourceSize is required"
            );
        }

        if (!Array.isArray(fieldDefinitions)) {
            throw new TypeError(
                "fieldDefinitions are required"
            );
        }

        const currentFields =
            new Map();

        for (
            const field
            of fieldDefinitions
        ) {
            const sourceFieldKey =
                typeof field?.sourceFieldKey ===
                    "string"
                    ? field.sourceFieldKey.trim()
                    : "";

            if (!sourceFieldKey) {
                continue;
            }

            currentFields.set(
                sourceFieldKey,
                field
            );
        }

        const authorityResult =
            await this.semanticRegistrationClient
                .listAuthority(
                    templateId.trim()
                );

        if (
            authorityResult?.status !== "found" ||
            !Array.isArray(
                authorityResult.mappings
            )
        ) {
            throw new Error(
                "Template Semantic Authority is unavailable"
            );
        }

        const confirmedMappings =
            authorityResult.mappings.filter(
                mapping =>
                    mapping?.mappingStatus ===
                        "mapped" &&
                    mapping
                        ?.interpretationStatus ===
                        "confirmed" &&
                    typeof mapping
                        ?.templateFieldKey ===
                        "string" &&
                    mapping
                        .templateFieldKey
                        .trim() &&
                    typeof mapping
                        ?.standardEntityName ===
                        "string" &&
                    mapping
                        .standardEntityName
                        .trim() &&
                    typeof mapping
                        ?.standardFieldName ===
                        "string" &&
                    mapping
                        .standardFieldName
                        .trim()
            );

        for (
            const authority
            of confirmedMappings
        ) {
            const sourceFieldKey =
                authority
                    .templateFieldKey
                    .trim();

            if (
                !currentFields.has(
                    sourceFieldKey
                )
            ) {
                throw new Error(
                    `Template field is missing from current source: ${sourceFieldKey}`
                );
            }
        }

        const results = [];
        const interpretationResults = [];

        for (
            const authority
            of confirmedMappings
        ) {
            const sourceFieldKey =
                authority
                    .templateFieldKey
                    .trim();

            const field =
                currentFields.get(
                    sourceFieldKey
                );

            const result =
                await this.sourceFieldMappingClient
                    .ingest({
                        sourceDocumentKey:
                            sourceDocumentKey.trim(),

                        sourceFieldKey,

                        standardEntityName:
                            authority
                                .standardEntityName
                                .trim(),

                        standardFieldName:
                            authority
                                .standardFieldName
                                .trim(),

                        sheetName:
                            typeof field.sheetName ===
                                "string"
                                ? field.sheetName
                                : null,

                        headerLabel:
                            typeof field.headerLabel ===
                                "string"
                                ? field.headerLabel
                                : typeof field.label ===
                                    "string"
                                    ? field.label
                                    : null,

                        sourceUpdatedAt:
                            new Date(
                                sourceUpdatedAt
                            ).toISOString(),

                        sourceSize
                    });

            results.push({
                sourceFieldKey,
                status:
                    result?.status || null
            });

            const standardEntityName =
                authority
                    .standardEntityName
                    .trim();

            const standardFieldName =
                authority
                    .standardFieldName
                    .trim();

            const interpretationResult =
                await this
                    .sourceFieldInterpretationClient
                    .ingest({
                        sourceDocumentKey:
                            sourceDocumentKey.trim(),

                        sourceUpdatedAt:
                            new Date(
                                sourceUpdatedAt
                            ).toISOString(),

                        sourceSize,

                        sourceFieldKey,

                        interpretationStatus:
                            "confirmed",

                        mappingStatus:
                            "mapped",

                        confirmedMeaning:
                            `${standardEntityName}.${standardFieldName}`
                    });

            interpretationResults.push({
                sourceFieldKey,
                status:
                    interpretationResult?.status ||
                    null
            });
        }

        return {
            status: "applied",
            templateId:
                templateId.trim(),
            authorityCount:
                confirmedMappings.length,
            appliedCount:
                results.length,
            createdCount:
                results.filter(
                    item =>
                        item.status ===
                        "created"
                ).length,
            updatedCount:
                results.filter(
                    item =>
                        item.status ===
                        "updated"
                ).length,
            unchangedCount:
                results.filter(
                    item =>
                        item.status ===
                        "unchanged"
                ).length,

            interpretationAppliedCount:
                interpretationResults.length,

            interpretationCreatedCount:
                interpretationResults.filter(
                    item =>
                        item.status ===
                        "created"
                ).length,

            interpretationUpdatedCount:
                interpretationResults.filter(
                    item =>
                        item.status ===
                        "updated"
                ).length,

            interpretationUnchangedCount:
                interpretationResults.filter(
                    item =>
                        item.status ===
                        "unchanged"
                ).length,

            results,
            interpretationResults
        };
    }
}

module.exports =
    SourceTemplateAuthorityFieldMappingService;
