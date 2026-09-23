"use strict";

class SourceRecordIdentityCandidateResolver {
    resolve({ fieldDefinitions, sourceEntities } = {}) {
        if (
            !Array.isArray(fieldDefinitions) ||
            !Array.isArray(sourceEntities) ||
            sourceEntities.length === 0
        ) {
            return {
                status: "insufficient_source",
                candidates: []
            };
        }

        const candidates = [];

        for (const field of fieldDefinitions) {
            const sourceFieldKey =
                typeof field?.sourceFieldKey === "string"
                    ? field.sourceFieldKey.trim()
                    : "";

            if (!sourceFieldKey) continue;

            let missingFieldCount = 0;
            let blankValueCount = 0;
            const values = new Set();
            let duplicateValueCount = 0;

            for (const entity of sourceEntities) {
                const valueMap =
                    entity &&
                    typeof entity === "object" &&
                    entity.valuesBySourceFieldKey &&
                    typeof entity.valuesBySourceFieldKey === "object"
                        ? entity.valuesBySourceFieldKey
                        : null;

                if (!valueMap || !Object.prototype.hasOwnProperty.call(valueMap, sourceFieldKey)) {
                    missingFieldCount += 1;
                    continue;
                }

                const normalized =
                    valueMap[sourceFieldKey] === null ||
                    valueMap[sourceFieldKey] === undefined
                        ? ""
                        : String(valueMap[sourceFieldKey]).trim();

                if (!normalized) {
                    blankValueCount += 1;
                    continue;
                }

                if (values.has(normalized)) {
                    duplicateValueCount += 1;
                } else {
                    values.add(normalized);
                }
            }

            const structurallySafe =
                missingFieldCount === 0 &&
                blankValueCount === 0 &&
                duplicateValueCount === 0 &&
                values.size === sourceEntities.length;

            if (!structurallySafe) continue;

            candidates.push({
                sourceFieldKey,
                headerLabel:
                    typeof field.headerLabel === "string"
                        ? field.headerLabel
                        : "",
                sourceEntityCount: sourceEntities.length,
                uniqueValueCount: values.size,
                status: "candidate",
                humanConfirmationRequired: true
            });
        }

        return {
            status:
                candidates.length > 0
                    ? "candidates_available"
                    : "no_safe_single_field_candidate",
            candidates
        };
    }
}

module.exports = SourceRecordIdentityCandidateResolver;
