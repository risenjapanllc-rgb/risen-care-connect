"use strict";

class StandardMeaningCandidatePayloadValidator {
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
            proposedMeaning,
            evidence = {},
            submittedAt
        } = input;

        if (
            !this.nonEmpty(templateId) ||
            !this.nonEmpty(templateFieldKey) ||
            !this.nonEmpty(proposedMeaning) ||
            !this.isoDate(submittedAt) ||
            !this.isPlainObject(evidence)
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
                proposedMeaning:
                    proposedMeaning.trim(),
                evidence,
                submittedAt:
                    new Date(
                        submittedAt
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

    isPlainObject(value) {
        return (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }
}

module.exports =
    StandardMeaningCandidatePayloadValidator;
