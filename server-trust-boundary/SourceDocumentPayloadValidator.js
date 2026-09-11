"use strict";

class SourceDocumentPayloadValidator {
    validate(sourceDocument) {
        if (
            !sourceDocument ||
            typeof sourceDocument !== "object" ||
            Array.isArray(sourceDocument)
        ) {
            return this.invalid();
        }

        const {
            sourceDocumentKey,
            sourceType,
            fileName,
            sourceContent,
            sourceUpdatedAt,
            sourceSize,
            observedAt
        } = sourceDocument;

        if (
            !this.isNonEmptyString(sourceDocumentKey) ||
            !this.isNonEmptyString(sourceType) ||
            !this.isNonEmptyString(fileName) ||
            !this.isPlainObject(sourceContent) ||
            !this.isNullableIsoDateTime(sourceUpdatedAt) ||
            !this.isNullableNonNegativeInteger(sourceSize) ||
            !this.isIsoDateTime(observedAt)
        ) {
            return this.invalid();
        }

        return {
            status: "valid",
            validatedSourceDocument: {
                sourceDocumentKey:
                    sourceDocumentKey.trim(),
                sourceType:
                    sourceType.trim(),
                fileName:
                    fileName.trim(),
                sourceContent,
                sourceUpdatedAt,
                sourceSize,
                observedAt
            }
        };
    }

    invalid() {
        return {
            status: "invalid",
            errorCode:
                "source_document_invalid"
        };
    }

    isNonEmptyString(value) {
        return (
            typeof value === "string" &&
            value.trim() !== ""
        );
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

    isIsoDateTime(value) {
        return (
            typeof value === "string" &&
            value.trim() !== "" &&
            !Number.isNaN(Date.parse(value))
        );
    }

    isNullableIsoDateTime(value) {
        return (
            value === null ||
            this.isIsoDateTime(value)
        );
    }

    isNullableNonNegativeInteger(value) {
        return (
            value === null ||
            (
                Number.isInteger(value) &&
                value >= 0
            )
        );
    }
}

module.exports =
    SourceDocumentPayloadValidator;
