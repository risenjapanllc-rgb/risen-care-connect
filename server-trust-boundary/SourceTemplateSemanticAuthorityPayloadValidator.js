"use strict";

class SourceTemplateSemanticAuthorityPayloadValidator {
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
            templateFieldKey,
            interpretationStatus,
            mappingStatus,
            confirmedMeaning = null,
            standardEntityName = null,
            standardFieldName = null,
            confirmedAt
        } = input;

        if (
            !this.nonEmpty(templateId) ||
            !this.nonEmpty(templateFieldKey) ||
            !this.nonEmpty(interpretationStatus) ||
            !this.nonEmpty(mappingStatus) ||
            !this.isoDate(confirmedAt)
        ) {
            return {
                status: "invalid"
            };
        }

        return {
            status: "valid",
            validated: {
                templateId:
                    templateId.trim(),
                templateFieldKey:
                    templateFieldKey.trim(),
                interpretationStatus:
                    interpretationStatus
                        .trim()
                        .toLowerCase(),
                mappingStatus:
                    mappingStatus
                        .trim()
                        .toLowerCase(),
                confirmedMeaning:
                    this.nullableTrim(
                        confirmedMeaning
                    ),
                standardEntityName:
                    this.nullableTrim(
                        standardEntityName
                    ),
                standardFieldName:
                    this.nullableTrim(
                        standardFieldName
                    ),
                confirmedAt:
                    new Date(
                        confirmedAt
                    ).toISOString()
            }
        };
    }

    nonEmpty(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
    }

    nullableTrim(value) {
        return (
            typeof value === "string" &&
            value.trim()
        )
            ? value.trim()
            : null;
    }

    isoDate(value) {
        return (
            this.nonEmpty(value) &&
            !Number.isNaN(
                Date.parse(value)
            )
        );
    }
}

module.exports =
    SourceTemplateSemanticAuthorityPayloadValidator;
