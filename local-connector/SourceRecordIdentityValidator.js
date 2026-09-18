"use strict";

class SourceRecordIdentityValidator {
    validate({
        sourceEntities,
        sourceFieldKey
    } = {}) {
        if (
            !Array.isArray(sourceEntities) ||
            sourceEntities.length === 0 ||
            typeof sourceFieldKey !== "string" ||
            !sourceFieldKey.trim()
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_record_identity_validation_invalid"
            };
        }

        const normalizedFieldKey =
            sourceFieldKey.trim();

        let missingFieldCount = 0;
        let blankValueCount = 0;
        let duplicateValueCount = 0;

        const seen =
            new Set();

        for (const sourceEntity of sourceEntities) {
            if (
                !sourceEntity ||
                typeof sourceEntity !== "object" ||
                Array.isArray(sourceEntity) ||
                !sourceEntity.valuesBySourceFieldKey ||
                typeof sourceEntity.valuesBySourceFieldKey !==
                    "object" ||
                Array.isArray(
                    sourceEntity.valuesBySourceFieldKey
                )
            ) {
                return {
                    status: "invalid",
                    errorCode:
                        "source_entity_invalid"
                };
            }

            if (
                !Object.prototype.hasOwnProperty.call(
                    sourceEntity.valuesBySourceFieldKey,
                    normalizedFieldKey
                )
            ) {
                missingFieldCount += 1;
                continue;
            }

            const rawValue =
                sourceEntity.valuesBySourceFieldKey[
                    normalizedFieldKey
                ];

            const value =
                rawValue === null ||
                rawValue === undefined
                    ? ""
                    : String(rawValue).trim();

            if (!value) {
                blankValueCount += 1;
                continue;
            }

            if (seen.has(value)) {
                duplicateValueCount += 1;
                continue;
            }

            seen.add(value);
        }

        const sourceEntityCount =
            sourceEntities.length;

        const uniqueValueCount =
            seen.size;

        if (missingFieldCount > 0) {
            return {
                status: "invalid",
                errorCode:
                    "source_record_identity_field_missing",
                sourceEntityCount,
                missingFieldCount,
                blankValueCount,
                duplicateValueCount,
                uniqueValueCount
            };
        }

        if (blankValueCount > 0) {
            return {
                status: "invalid",
                errorCode:
                    "source_record_identity_value_missing",
                sourceEntityCount,
                missingFieldCount,
                blankValueCount,
                duplicateValueCount,
                uniqueValueCount
            };
        }

        if (
            duplicateValueCount > 0 ||
            uniqueValueCount !== sourceEntityCount
        ) {
            return {
                status: "invalid",
                errorCode:
                    "source_record_identity_not_unique",
                sourceEntityCount,
                missingFieldCount,
                blankValueCount,
                duplicateValueCount,
                uniqueValueCount
            };
        }

        return {
            status: "valid",
            sourceFieldKey:
                normalizedFieldKey,
            sourceEntityCount,
            uniqueValueCount
        };
    }
}

module.exports =
    SourceRecordIdentityValidator;
