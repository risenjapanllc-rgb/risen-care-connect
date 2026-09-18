"use strict";

class ConnectorSupportRecordPreviewComparator {
    compare({
        sourceRow,
        existingRecord
    } = {}) {
        if (!this.isPlainObject(sourceRow)) {
            return this.invalid(
                "source_record_invalid"
            );
        }

        if (!existingRecord) {
            return {
                status: "new",
                mergedFields:
                    this.buildNewFields(sourceRow)
            };
        }

        if (!this.isPlainObject(existingRecord)) {
            return this.review(
                "existing_record_invalid"
            );
        }

        if (
            existingRecord.residentId !==
            sourceRow.resident_id
        ) {
            return this.review(
                "resident_mismatch"
            );
        }

        if (
            existingRecord.semanticType !==
            "support_record"
        ) {
            return this.review(
                "semantic_type_mismatch"
            );
        }

        if (
            existingRecord.canonicalizationVersion !==
            "risen-semantic-canonicalization-2"
        ) {
            return this.review(
                "canonicalization_incompatible"
            );
        }

        const semanticContent =
            existingRecord.semanticContent;

        if (
            !this.isPlainObject(semanticContent) ||
            semanticContent.semanticType !==
                "support_record" ||
            !this.isPlainObject(
                semanticContent.fields
            )
        ) {
            return this.review(
                "existing_semantic_content_invalid"
            );
        }

        const existingFields =
            semanticContent.fields;

        const mergedFields = {};
        let changed = false;

        for (
            const key of [
                "record_date",
                "record_content",
                "staff_name",
                "record_category",
                "created_at"
            ]
        ) {
            const sourceValue =
                this.normalizeValue(sourceRow[key]);
            const existingValue =
                this.normalizeValue(
                    existingFields[key]
                );

            if (sourceValue === null) {
                mergedFields[key] =
                    existingValue;
                continue;
            }

            mergedFields[key] =
                sourceValue;

            if (sourceValue !== existingValue) {
                changed = true;
            }
        }

        return {
            status:
                changed
                    ? "update"
                    : "unchanged",
            mergedFields
        };
    }

    buildNewFields(sourceRow) {
        const fields = {};

        for (
            const key of [
                "record_date",
                "record_content",
                "staff_name",
                "record_category",
                "created_at"
            ]
        ) {
            fields[key] =
                this.normalizeValue(
                    sourceRow[key]
                );
        }

        return fields;
    }

    normalizeValue(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        if (typeof value !== "string") {
            return value;
        }

        const trimmed = value.trim();

        return trimmed === ""
            ? null
            : trimmed;
    }

    invalid(reason) {
        return {
            status: "invalid",
            reason
        };
    }

    review(reason) {
        return {
            status: "review",
            reason
        };
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
    ConnectorSupportRecordPreviewComparator;
