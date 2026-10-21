"use strict";

class WordSourceTemplateReviewedPayloadValidator {
    validate(input) {
        if (!this.isPlainObject(input)) {
            return {
                status: "invalid",
                errorCode:
                    "word_source_template_reviewed_missing"
            };
        }

        const {
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize,
            displayName,
            documentType = null,
            fields,
            confirmedByHuman,
            confirmedAt
        } = input;

        if (
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isIsoDate(sourceUpdatedAt) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            !this.isNonEmptyString(displayName) ||
            !this.isNullableNonEmptyString(documentType) ||
            !Array.isArray(fields) ||
            fields.length === 0 ||
            confirmedByHuman !== true ||
            !this.isIsoDate(confirmedAt)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "word_source_template_reviewed_invalid"
            };
        }

        const validatedFields = [];
        const identities = new Set();
        const positions = new Set();

        for (const field of fields) {
            if (!this.isPlainObject(field)) {
                return {
                    status: "invalid",
                    errorCode:
                        "word_source_template_field_invalid"
                };
            }

            const {
                templateFieldKey,
                structuralPath,
                tableIndex,
                rowIndex,
                headerLabel = null,
                normalizedHeaderLabel
            } = field;

            if (
                !this.isNonEmptyString(
                    templateFieldKey
                ) ||
                !this.isNonEmptyString(
                    structuralPath
                ) ||
                !Number.isSafeInteger(
                    tableIndex
                ) ||
                tableIndex < 0 ||
                !Number.isSafeInteger(
                    rowIndex
                ) ||
                rowIndex < 0 ||
                !this.isNullableString(
                    headerLabel
                ) ||
                !this.isNonEmptyString(
                    normalizedHeaderLabel
                )
            ) {
                return {
                    status: "invalid",
                    errorCode:
                        "word_source_template_field_invalid"
                };
            }

            const expectedKey =
                `word:table:${tableIndex}:row:${rowIndex}`;

            if (
                templateFieldKey.trim() !==
                    expectedKey ||
                structuralPath.trim() !==
                    expectedKey
            ) {
                return {
                    status: "invalid",
                    errorCode:
                        "word_source_template_field_identity_invalid"
                };
            }

            if (
                identities.has(
                    expectedKey
                )
            ) {
                return {
                    status: "invalid",
                    errorCode:
                        "word_source_template_field_duplicate"
                };
            }

            const positionKey =
                `${tableIndex}:${rowIndex}`;

            if (
                positions.has(
                    positionKey
                )
            ) {
                return {
                    status: "invalid",
                    errorCode:
                        "word_source_template_position_duplicate"
                };
            }

            identities.add(
                expectedKey
            );

            positions.add(
                positionKey
            );

            validatedFields.push({
                template_field_key:
                    expectedKey,

                structural_path:
                    expectedKey,

                sheet_index:
                    tableIndex,

                ordinal:
                    rowIndex,

                sheet_name:
                    null,

                header_label:
                    typeof headerLabel === "string" &&
                    headerLabel.trim()
                        ? headerLabel.trim()
                        : null,

                normalized_header_label:
                    normalizedHeaderLabel.trim()
            });
        }

        return {
            status: "valid",

            validatedWordSourceTemplateReviewed: {
                sourceDocumentKey:
                    sourceDocumentKey.trim(),

                sourceUpdatedAt:
                    new Date(
                        sourceUpdatedAt
                    ).toISOString(),

                sourceSize,

                displayName:
                    displayName.trim(),

                documentType:
                    documentType === null
                        ? null
                        : documentType.trim(),

                fields:
                    validatedFields,

                confirmedByHuman:
                    true,

                confirmedAt:
                    new Date(
                        confirmedAt
                    ).toISOString()
            }
        };
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    isNullableNonEmptyString(value) {
        return (
            value === null ||
            this.isNonEmptyString(value)
        );
    }

    isNullableString(value) {
        return (
            value === null ||
            typeof value === "string"
        );
    }

    isIsoDate(value) {
        return (
            this.isNonEmptyString(value) &&
            !Number.isNaN(
                Date.parse(value)
            )
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
    WordSourceTemplateReviewedPayloadValidator;
