"use strict";

class SourceFieldInterpretationPayloadValidator {
    validate(sourceFieldInterpretation) {
        if (!this.isPlainObject(sourceFieldInterpretation)) {
            return {
                status: "invalid",
                errorCode:
                    "source_field_interpretation_missing"
            };
        }

        const {
            sourceDocumentKey,
            sourceFieldKey,
            interpretationStatus,
            mappingStatus,
            confirmedMeaning = null
        } = sourceFieldInterpretation;

        if (!this.isNonEmptyString(sourceDocumentKey)) {
            return {
                status: "invalid",
                errorCode:
                    "source_document_key_invalid"
            };
        }

        if (!this.isNonEmptyString(sourceFieldKey)) {
            return {
                status: "invalid",
                errorCode:
                    "source_field_key_invalid"
            };
        }

        if (
            ![
                "confirmed",
                "deferred",
                "excluded"
            ].includes(interpretationStatus)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "interpretation_status_invalid"
            };
        }

        if (
            ![
                "unmapped",
                "mapped",
                "no_standard_match"
            ].includes(mappingStatus)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "mapping_status_invalid"
            };
        }

        if (!this.isNullableString(confirmedMeaning)) {
            return {
                status: "invalid",
                errorCode:
                    "confirmed_meaning_invalid"
            };
        }

        return {
            status: "valid",
            validatedSourceFieldInterpretation: {
                sourceDocumentKey:
                    sourceDocumentKey.trim(),
                sourceFieldKey:
                    sourceFieldKey.trim(),
                interpretationStatus,
                mappingStatus,
                confirmedMeaning:
                    confirmedMeaning === null
                        ? null
                        : confirmedMeaning.trim() || null
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
    SourceFieldInterpretationPayloadValidator;
