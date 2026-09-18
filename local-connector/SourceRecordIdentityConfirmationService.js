"use strict";

const SourceRecordIdentityValidator =
    require("./SourceRecordIdentityValidator");

class SourceRecordIdentityConfirmationService {
    constructor({
        localConnectorService,
        validator =
            new SourceRecordIdentityValidator()
    } = {}) {
        if (
            !localConnectorService ||
            typeof localConnectorService.resolveSourceSnapshot !==
                "function"
        ) {
            throw new Error(
                "SourceRecordIdentityConfirmationService requires localConnectorService"
            );
        }

        if (
            !validator ||
            typeof validator.validate !== "function"
        ) {
            throw new Error(
                "SourceRecordIdentityConfirmationService requires validator"
            );
        }

        this.localConnectorService =
            localConnectorService;
        this.validator =
            validator;
    }

    async validate({
        sourceDocumentKey,
        sourceUpdatedAt,
        sourceSize,
        sourceFieldKey
    } = {}) {
        if (
            typeof sourceFieldKey !== "string" ||
            !sourceFieldKey.trim()
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_record_identity_field_invalid"
            };
        }

        const snapshot =
            await this.localConnectorService
                .resolveSourceSnapshot({
                    sourceDocumentKey,
                    sourceUpdatedAt,
                    sourceSize
                });

        const sourceEntities =
            snapshot.analysis?.extracted
                ?.sourceEntities;

        if (!Array.isArray(sourceEntities)) {
            return {
                status: "invalid",
                errorCode:
                    "source_entities_unavailable"
            };
        }

        const normalizedSourceFieldKey =
            sourceFieldKey.trim();

        const fieldDefinitions =
            Array.isArray(
                snapshot.analysis?.extracted
                    ?.fieldDefinitions
            )
                ? snapshot.analysis.extracted
                    .fieldDefinitions
                : [];

        const fieldDefinition =
            fieldDefinitions.find(field =>
                field &&
                typeof field.sourceFieldKey ===
                    "string" &&
                field.sourceFieldKey.trim() ===
                    normalizedSourceFieldKey
            );

        if (!fieldDefinition) {
            return {
                status: "invalid",
                errorCode:
                    "source_record_identity_field_unknown"
            };
        }

        const validation =
            this.validator.validate({
                sourceEntities,
                sourceFieldKey:
                    normalizedSourceFieldKey
            });

        if (validation.status !== "valid") {
            return validation;
        }

        return {
            status: "valid",
            sourceDocumentKey:
                snapshot.sourceDocumentKey,
            sourceUpdatedAt:
                snapshot.sourceUpdatedAt,
            sourceSize:
                snapshot.sourceSize,
            sourceFieldKey:
                normalizedSourceFieldKey,
            sheetName:
                typeof fieldDefinition.sheetName ===
                    "string"
                    ? fieldDefinition.sheetName
                    : null,
            headerLabel:
                typeof fieldDefinition.headerLabel ===
                    "string"
                    ? fieldDefinition.headerLabel
                    : null,
            sourceEntityCount:
                validation.sourceEntityCount,
            uniqueValueCount:
                validation.uniqueValueCount
        };
    }
}

module.exports =
    SourceRecordIdentityConfirmationService;
