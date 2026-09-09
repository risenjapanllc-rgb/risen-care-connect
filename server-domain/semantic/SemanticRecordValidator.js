"use strict";

class SemanticRecordValidator {
    constructor() {
        this.allowedSourceTypes = new Set([
            "word",
            "excel"
        ]);

        this.iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([Z]|[+-]\d{2}:\d{2})$/;
    }

    validate(record) {
        if (!this.isPlainObject(record)) {
            return this.invalid("semantic_record_invalid");
        }

        const sourceRecordContext = this.validateSourceRecordContext(record);
        if (sourceRecordContext.errorCode) {
            return this.invalid(sourceRecordContext.errorCode);
        }

        const semanticContent = this.getOwn(record, "semanticContent");
        if (!this.isPlainObject(semanticContent)) {
            return this.invalid("semantic_content_missing");
        }

        if (this.getOwn(semanticContent, "semanticType") !== "support_record") {
            return this.invalid("semantic_type_invalid");
        }

        const fields = this.getOwn(semanticContent, "fields");
        if (!this.isPlainObject(fields)) {
            return this.invalid("semantic_fields_missing");
        }

        const supportContent = this.getOwn(fields, "supportContent");
        if (
            typeof supportContent !== "string" ||
            supportContent.trim() === ""
        ) {
            return this.invalid("semantic_support_content_invalid");
        }

        const customFields = this.getOwn(semanticContent, "customFields");
        if (!this.isPlainObject(customFields) || Object.keys(customFields).length > 0) {
            return this.invalid("semantic_custom_fields_invalid");
        }

        const provenance = this.validateProvenance(record);
        if (provenance.errorCode) {
            return this.invalid(provenance.errorCode);
        }

        return {
            status: "valid",
            validatedSemanticRecord: {
                sourceRecordContext: sourceRecordContext.value,
                semanticContent: {
                    semanticType: "support_record",
                    fields: {
                        supportContent
                    },
                    customFields: {}
                },
                provenance: provenance.value
            }
        };
    }

    validateSourceRecordContext(record) {
        const context = this.getOwn(record, "sourceRecordContext");
        if (!this.isPlainObject(context)) {
            return { value: {} };
        }

        const value = {};
        for (const key of ["sourceResidentIdentifier", "sourceResidentName"]) {
            if (!this.hasOwn(context, key)) {
                continue;
            }

            const fieldValue = context[key];
            if (typeof fieldValue !== "string") {
                return { errorCode: "semantic_source_record_context_invalid" };
            }

            if (fieldValue.trim() !== "") {
                value[key] = fieldValue;
            }
        }

        return { value };
    }

    validateProvenance(record) {
        const provenance = this.getOwn(record, "provenance");
        if (!this.isPlainObject(provenance)) {
            return { errorCode: "semantic_provenance_invalid" };
        }

        const sourceDocumentKey =
            this.getOwn(
                provenance,
                "sourceDocumentKey"
            );

        if (
            sourceDocumentKey !== undefined &&
            (
                typeof sourceDocumentKey !== "string" ||
                sourceDocumentKey.trim() === ""
            )
        ) {
            return {
                errorCode:
                    "semantic_provenance_source_document_key_invalid"
            };
        }

        const fileName = this.getOwn(provenance, "fileName");
        if (
            fileName !== undefined &&
            (
                typeof fileName !== "string" ||
                fileName === "" ||
                fileName.includes("/") ||
                fileName.includes("\\")
            )
        ) {
            return { errorCode: "semantic_provenance_filename_invalid" };
        }

        const sourceUpdatedAt = this.getOwn(provenance, "sourceUpdatedAt");
        if (
            sourceUpdatedAt !== undefined &&
            (
                typeof sourceUpdatedAt !== "string" ||
                !this.isValidISO8601DateTime(sourceUpdatedAt)
            )
        ) {
            return { errorCode: "semantic_provenance_updated_at_invalid" };
        }

        if (this.getOwn(provenance, "documentType") !== "support_record") {
            return { errorCode: "semantic_provenance_document_type_invalid" };
        }

        const sourceType = this.getOwn(provenance, "sourceType");
        if (
            typeof sourceType !== "string" ||
            !this.allowedSourceTypes.has(sourceType)
        ) {
            return { errorCode: "semantic_provenance_source_type_invalid" };
        }

        const value = {
            documentType: "support_record",
            sourceType
        };

        if (sourceDocumentKey !== undefined) {
            value.sourceDocumentKey =
                sourceDocumentKey;
        }

        if (fileName !== undefined) {
            value.fileName = fileName;
        }
        if (sourceUpdatedAt !== undefined) {
            value.sourceUpdatedAt = sourceUpdatedAt;
        }

        return { value };
    }

    isValidISO8601DateTime(dateString) {
        const match = this.iso8601Regex.exec(dateString);
        if (!match) {
            return false;
        }

        const year = Number(dateString.slice(0, 4));
        const month = Number(dateString.slice(5, 7));
        const day = Number(dateString.slice(8, 10));
        const hour = Number(dateString.slice(11, 13));
        const minute = Number(dateString.slice(14, 16));
        const second = Number(dateString.slice(17, 19));
        const timezone = match[2];

        if (hour > 23 || minute > 59 || second > 59) {
            return false;
        }

        if (timezone !== "Z") {
            const timezoneHour = Number(timezone.slice(1, 3));
            const timezoneMinute = Number(timezone.slice(4, 6));
            if (timezoneHour > 23 || timezoneMinute > 59) {
                return false;
            }
        }

        const calendarDate = new Date(Date.UTC(year, month - 1, day));
        if (
            calendarDate.getUTCFullYear() !== year ||
            calendarDate.getUTCMonth() !== month - 1 ||
            calendarDate.getUTCDate() !== day
        ) {
            return false;
        }

        return !isNaN(Date.parse(dateString));
    }

    isPlainObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }

        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    getOwn(object, key) {
        return this.hasOwn(object, key) ? object[key] : undefined;
    }

    invalid(errorCode) {
        return {
            status: "invalid",
            errorCode
        };
    }
}

module.exports = SemanticRecordValidator;
