"use strict";

class SourceTemplateFieldsPayloadValidator {
    validate(input) {
        if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input)
        ) {
            return {
                status: "invalid"
            };
        }

        const {
            templateId,
            fields
        } = input;

        if (
            typeof templateId !== "string" ||
            !templateId.trim() ||
            !Array.isArray(fields) ||
            fields.length === 0
        ) {
            return {
                status: "invalid"
            };
        }

        const validatedFields = [];

        for (const field of fields) {
            if (
                !field ||
                typeof field !== "object" ||
                Array.isArray(field)
            ) {
                return {
                    status: "invalid"
                };
            }

            const {
                templateFieldKey,
                structuralPath,
                sheetIndex,
                ordinal,
                sheetName = null,
                headerLabel = null,
                normalizedHeaderLabel
            } = field;

            if (
                typeof templateFieldKey !== "string" ||
                !templateFieldKey.trim() ||
                typeof structuralPath !== "string" ||
                !structuralPath.trim() ||
                !Number.isSafeInteger(sheetIndex) ||
                sheetIndex < 0 ||
                !Number.isSafeInteger(ordinal) ||
                ordinal < 0 ||
                (
                    sheetName !== null &&
                    typeof sheetName !== "string"
                ) ||
                (
                    headerLabel !== null &&
                    typeof headerLabel !== "string"
                ) ||
                typeof normalizedHeaderLabel !== "string" ||
                !normalizedHeaderLabel.trim()
            ) {
                return {
                    status: "invalid"
                };
            }

            validatedFields.push({
                template_field_key:
                    templateFieldKey.trim(),
                structural_path:
                    structuralPath.trim(),
                sheet_index:
                    sheetIndex,
                ordinal,
                sheet_name:
                    sheetName,
                header_label:
                    headerLabel,
                normalized_header_label:
                    normalizedHeaderLabel.trim()
            });
        }

        return {
            status: "valid",

            validatedSourceTemplateFields: {
                templateId:
                    templateId.trim(),
                fields:
                    validatedFields
            }
        };
    }
}

module.exports =
    SourceTemplateFieldsPayloadValidator;
