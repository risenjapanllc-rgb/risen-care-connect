"use strict";

const JapaneseBusinessDateNormalizer =
    require("./JapaneseBusinessDateNormalizer");

class RecipientCertificateSemanticPlanner {
    constructor() {
        this.dateNormalizer =
            new JapaneseBusinessDateNormalizer();
    }

    normalizeSemanticValue(
        semanticKey,
        value
    ) {
        const text =
            value === null ||
            value === undefined
                ? ""
                : String(value).trim();

        const dateMeanings =
            new Set([
                "user.birth_date",
                "recipient_certificate.valid_until"
            ]);

        if (!dateMeanings.has(semanticKey)) {
            return text;
        }

        return this.dateNormalizer.normalize(
            text,
            {
                order: "mdy",
                twoDigitYearPivot: 30
            }
        );
    }

    build({ sourceEntities, fieldMappings } = {}) {
        if (!Array.isArray(sourceEntities)) {
            throw new TypeError("sourceEntities are required");
        }

        if (!Array.isArray(fieldMappings)) {
            throw new TypeError("fieldMappings are required");
        }

        const usableMappings = fieldMappings.filter(mapping =>
            mapping &&
            typeof mapping.sourceFieldKey === "string" &&
            mapping.sourceFieldKey.trim() &&
            typeof mapping.standardEntityName === "string" &&
            mapping.standardEntityName.trim() &&
            typeof mapping.standardFieldName === "string" &&
            mapping.standardFieldName.trim()
        );

        return sourceEntities.map(entity => {
            const values =
                entity?.valuesBySourceFieldKey &&
                typeof entity.valuesBySourceFieldKey === "object" &&
                !Array.isArray(entity.valuesBySourceFieldKey)
                    ? entity.valuesBySourceFieldKey
                    : {};

            const semanticValues = {};

            for (const mapping of usableMappings) {
                const sourceFieldKey =
                    mapping.sourceFieldKey.trim();

                const rawValue = values[sourceFieldKey];

                if (
                    rawValue === null ||
                    rawValue === undefined ||
                    String(rawValue).trim() === ""
                ) {
                    continue;
                }

                const meaning =
                    mapping.standardEntityName.trim() +
                    "." +
                    mapping.standardFieldName.trim();

                if (Object.hasOwn(semanticValues, meaning)) {
                    const error = new Error(
                        "Recipient certificate semantic meaning is ambiguous"
                    );
                    error.code =
                        "recipient_certificate_semantic_ambiguity";
                    throw error;
                }

                semanticValues[meaning] =
                    this.normalizeSemanticValue(
                        meaning,
                        rawValue
                    );
            }

            return {
                sourceEntityKey:
                    typeof entity?.sourceEntityKey === "string"
                        ? entity.sourceEntityKey.trim()
                        : null,
                semanticValues
            };
        });
    }
}

module.exports = RecipientCertificateSemanticPlanner;
