"use strict";

function resolveHumanConfirmedFieldMappings(
    mappings,
    interpretations
) {
    const safeMappings =
        Array.isArray(mappings)
            ? mappings
            : [];

    const safeInterpretations =
        Array.isArray(interpretations)
            ? interpretations
            : [];

    const humanConfirmedMeanings =
        new Map(
            safeInterpretations
                .filter(
                    interpretation =>
                        interpretation &&
                        interpretation.confirmedByHuman === true &&
                        typeof interpretation.sourceFieldKey === "string" &&
                        interpretation.sourceFieldKey.trim() &&
                        typeof interpretation.confirmedMeaning === "string" &&
                        interpretation.confirmedMeaning.trim()
                )
                .map(
                    interpretation => [
                        interpretation.sourceFieldKey.trim(),
                        interpretation.confirmedMeaning.trim()
                    ]
                )
        );

    const humanConfirmedMappings =
        safeMappings.filter(mapping => {
            if (
                !mapping ||
                typeof mapping.sourceFieldKey !== "string" ||
                typeof mapping.standardEntityName !== "string" ||
                typeof mapping.standardFieldName !== "string"
            ) {
                return false;
            }

            const sourceFieldKey =
                mapping.sourceFieldKey.trim();

            const entityName =
                mapping.standardEntityName.trim();

            const fieldName =
                mapping.standardFieldName.trim();

            if (
                !sourceFieldKey ||
                !entityName ||
                !fieldName
            ) {
                return false;
            }

            const expectedMeaning =
                entityName + "." + fieldName;

            return (
                humanConfirmedMeanings.get(
                    sourceFieldKey
                ) === expectedMeaning
            );
        });

    return {
        humanConfirmedMeanings,
        humanConfirmedMappings
    };
}

module.exports = {
    resolveHumanConfirmedFieldMappings
};
