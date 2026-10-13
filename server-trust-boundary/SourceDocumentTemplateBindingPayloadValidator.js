"use strict";

class SourceDocumentTemplateBindingPayloadValidator {
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
            sourceDocumentKey,
            sourceUpdatedAt,
            sourceSize,
            templateId,
            matchMethod,
            matchConfidence = null,
            confirmedByHuman,
            confirmedAt = null
        } = input;

        if (
            !this.nonEmpty(sourceDocumentKey) ||
            !this.isoDate(sourceUpdatedAt) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            !this.nonEmpty(templateId) ||
            ![
                "exact_structure_fingerprint",
                "confirmed_by_human"
            ].includes(matchMethod) ||
            ![
                null,
                "high",
                "medium",
                "low"
            ].includes(matchConfidence) ||
            typeof confirmedByHuman !==
                "boolean"
        ) {
            return {
                status: "invalid"
            };
        }

        if (
            confirmedByHuman &&
            !this.isoDate(confirmedAt)
        ) {
            return {
                status: "invalid"
            };
        }

        if (
            !confirmedByHuman &&
            confirmedAt !== null
        ) {
            return {
                status: "invalid"
            };
        }

        return {
            status: "valid",
            validated: {
                sourceDocumentKey:
                    sourceDocumentKey.trim(),
                sourceUpdatedAt:
                    new Date(
                        sourceUpdatedAt
                    ).toISOString(),
                sourceSize,
                templateId:
                    templateId.trim(),
                matchMethod,
                matchConfidence,
                confirmedByHuman,
                confirmedAt:
                    confirmedAt === null
                        ? null
                        : new Date(
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
    SourceDocumentTemplateBindingPayloadValidator;
