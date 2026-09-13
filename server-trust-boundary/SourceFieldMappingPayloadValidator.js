"use strict";

class SourceFieldMappingPayloadValidator {
    validate(sourceFieldMapping) {
        if (!this.isPlainObject(sourceFieldMapping)) {
            return {
                status: "invalid",
                errorCode:
                    "source_field_mapping_missing"
            };
        }

        const {
            sourceDocumentKey,
            sourceFieldKey,
            standardEntityName,
            standardFieldName,
            sheetName = null,
            headerLabel = null
        } = sourceFieldMapping;

        if (
            !this.isNonEmptyString(
                sourceDocumentKey
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_document_key_invalid"
            };
        }

        if (
            !this.isNonEmptyString(
                sourceFieldKey
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_field_key_invalid"
            };
        }

        if (
            !this.isNonEmptyString(
                standardEntityName
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "standard_entity_name_invalid"
            };
        }

        if (
            !this.isNonEmptyString(
                standardFieldName
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "standard_field_name_invalid"
            };
        }

        if (!this.isNullableString(sheetName)) {
            return {
                status: "invalid",
                errorCode:
                    "sheet_name_invalid"
            };
        }

        if (!this.isNullableString(headerLabel)) {
            return {
                status: "invalid",
                errorCode:
                    "header_label_invalid"
            };
        }

        return {
            status: "valid",

            validatedSourceFieldMapping: {
                sourceDocumentKey:
                    sourceDocumentKey.trim(),

                sourceFieldKey:
                    sourceFieldKey.trim(),

                standardEntityName:
                    standardEntityName.trim(),

                standardFieldName:
                    standardFieldName.trim(),

                sheetName:
                    sheetName === null
                        ? null
                        : sheetName,

                headerLabel:
                    headerLabel === null
                        ? null
                        : headerLabel
            }
        };
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isNullableString(value) {
        return (
            value === null ||
            typeof value === "string"
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
}

module.exports =
    SourceFieldMappingPayloadValidator;
