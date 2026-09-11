"use strict";

class StandardDocumentValidator {
    validate(standardDocument) {
        const issues = [];

        if (
            !standardDocument ||
            typeof standardDocument !== "object" ||
            Array.isArray(standardDocument)
        ) {
            issues.push(
                "standard_document_unavailable"
            );

            return {
                valid: false,
                issues
            };
        }

        if (
            typeof standardDocument
                .sourceType !== "string" ||
            standardDocument.sourceType
                .trim() === ""
        ) {
            issues.push(
                "source_type_missing"
            );
        }

        if (
            typeof standardDocument
                .documentType !== "string" ||
            standardDocument.documentType
                .trim() === "" ||
            standardDocument.documentType ===
                "unknown"
        ) {
            issues.push(
                "document_type_unresolved"
            );
        }

        return {
            valid:
                issues.length === 0,
            issues
        };
    }
}

module.exports =
    StandardDocumentValidator;
