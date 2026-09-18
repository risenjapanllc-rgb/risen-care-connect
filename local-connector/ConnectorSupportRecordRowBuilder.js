"use strict";

class ConnectorSupportRecordRowBuilder {
    constructor() {
        this.requiredMappings = [
            ["user", "name"],
            ["support_record", "record_date"],
            ["support_record", "record_content"]
        ];

        this.supportRecordFields = new Set([
            "record_date",
            "record_content",
            "staff_name",
            "record_category",
            "created_at"
        ]);
    }

    build({
        sourceEntity,
        fieldMappings,
        residentId,
        sourceRecordIdentityFieldKey
    } = {}) {
        if (
            !sourceEntity ||
            typeof sourceEntity !== "object" ||
            Array.isArray(sourceEntity) ||
            typeof sourceEntity.sourceEntityKey !== "string" ||
            !sourceEntity.sourceEntityKey.trim()
        ) {
            return this.invalid("source_entity_invalid");
        }

        if (!Array.isArray(fieldMappings)) {
            return this.invalid("field_mappings_invalid");
        }

        if (
            typeof sourceRecordIdentityFieldKey !== "string" ||
            !sourceRecordIdentityFieldKey.trim()
        ) {
            return this.invalid(
                "source_record_identity_mapping_unavailable"
            );
        }

        const mappings =
            fieldMappings.filter(mapping =>
                mapping &&
                typeof mapping === "object" &&
                !Array.isArray(mapping) &&
                typeof mapping.sourceFieldKey === "string" &&
                mapping.sourceFieldKey.trim() &&
                typeof mapping.standardEntityName === "string" &&
                mapping.standardEntityName.trim() &&
                typeof mapping.standardFieldName === "string" &&
                mapping.standardFieldName.trim()
            );

        for (const [entityName, fieldName] of this.requiredMappings) {
            const matches =
                mappings.filter(mapping =>
                    mapping.standardEntityName === entityName &&
                    mapping.standardFieldName === fieldName
                );

            if (matches.length !== 1) {
                return this.invalid(
                    `required_mapping_${entityName}_${fieldName}_invalid`
                );
            }
        }

        if (
            typeof residentId !== "string" ||
            !residentId.trim()
        ) {
            return this.invalid("resident_id_unresolved");
        }

        const values =
            sourceEntity.valuesBySourceFieldKey &&
            typeof sourceEntity.valuesBySourceFieldKey === "object" &&
            !Array.isArray(sourceEntity.valuesBySourceFieldKey)
                ? sourceEntity.valuesBySourceFieldKey
                : {};

        const valueFor =
            (entityName, fieldName) => {
                const mapping =
                    mappings.find(item =>
                        item.standardEntityName === entityName &&
                        item.standardFieldName === fieldName
                    );

                if (!mapping) {
                    return null;
                }

                const raw =
                    values[mapping.sourceFieldKey.trim()];

                if (raw === null || raw === undefined) {
                    return null;
                }

                const normalized =
                    String(raw).trim();

                return normalized || null;
            };

        const sourceRecordIdentityRaw =
            values[sourceRecordIdentityFieldKey.trim()];

        const sourceRecordKey =
            sourceRecordIdentityRaw === null ||
            sourceRecordIdentityRaw === undefined
                ? null
                : String(sourceRecordIdentityRaw).trim() || null;

        if (!sourceRecordKey) {
            return this.invalid(
                "source_record_identity_missing"
            );
        }

        const residentName =
            valueFor("user", "name");

        const recordDate =
            valueFor("support_record", "record_date");

        const recordContent =
            valueFor("support_record", "record_content");

        if (!residentName) {
            return this.invalid("resident_name_missing");
        }

        if (!recordDate) {
            return this.invalid("record_date_missing");
        }

        if (!recordContent) {
            return this.invalid("record_content_missing");
        }

        const fields = {
            resident_id: residentId.trim(),
            record_date: recordDate,
            record_content: recordContent
        };

        for (const fieldName of this.supportRecordFields) {
            if (
                fieldName === "record_date" ||
                fieldName === "record_content"
            ) {
                continue;
            }

            fields[fieldName] =
                valueFor("support_record", fieldName);
        }

        return {
            status: "ready",
            sourceRecordKey,
            residentName,
            fields
        };
    }

    invalid(errorCode) {
        return {
            status: "invalid",
            errorCode
        };
    }
}

module.exports =
    ConnectorSupportRecordRowBuilder;
