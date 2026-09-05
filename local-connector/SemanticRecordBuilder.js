"use strict";

/**
 * Builds the minimum semantic record envelope from an extracted document.
 *
 * This builder does not normalize content or resolve any server identity.
 */
class SemanticRecordBuilder {
    build(standardDocument = {}) {
        if (
            !standardDocument ||
            typeof standardDocument !== "object" ||
            Array.isArray(standardDocument) ||
            standardDocument.documentType !== "support_record"
        ) {
            return [];
        }

        const extracted = standardDocument.extracted;
        const supportContent = extracted?.supportContent;
        if (
            !supportContent ||
            typeof supportContent !== "object" ||
            Array.isArray(supportContent) ||
            typeof supportContent.value !== "string" ||
            supportContent.value.trim() === ""
        ) {
            return [];
        }

        const sourceRecordContext = {};
        this.copySourceValue(
            sourceRecordContext,
            "sourceResidentIdentifier",
            extracted?.sourceResidentIdentifier
        );
        this.copySourceValue(
            sourceRecordContext,
            "sourceResidentName",
            extracted?.sourceResidentName
        );

        const provenance = {
            documentType: "support_record"
        };
        this.copySafeFileName(
            provenance,
            "fileName",
            standardDocument.source?.fileName
        );
        this.copyStringValue(
            provenance,
            "sourceUpdatedAt",
            standardDocument.source?.updatedAt
        );
        this.copyStringValue(
            provenance,
            "sourceType",
            standardDocument.sourceType
        );

        return [
            {
                sourceRecordContext,
                semanticContent: {
                    semanticType: "support_record",
                    fields: {
                        supportContent: supportContent.value
                    },
                    customFields: {}
                },
                provenance
            }
        ];
    }

    copySourceValue(target, key, sourceValue) {
        if (
            sourceValue &&
            typeof sourceValue === "object" &&
            !Array.isArray(sourceValue) &&
            typeof sourceValue.value === "string" &&
            sourceValue.value.trim() !== ""
        ) {
            target[key] = sourceValue.value;
        }
    }

    copyStringValue(target, key, value) {
        if (typeof value === "string" && value !== "") {
            target[key] = value;
        }
    }

    copySafeFileName(target, key, value) {
        if (
            typeof value === "string" &&
            value !== "" &&
            !value.includes("\/") &&
            !value.includes("\\")
        ) {
            target[key] = value;
        }
    }
}

module.exports = SemanticRecordBuilder;
