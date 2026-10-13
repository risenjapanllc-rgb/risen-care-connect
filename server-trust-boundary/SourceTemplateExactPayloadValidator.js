"use strict";

class SourceTemplateExactPayloadValidator {
    validate(sourceTemplateExact) {
        if (!this.isPlainObject(sourceTemplateExact)) {
            return {
                status: "invalid",
                errorCode:
                    "source_template_exact_missing"
            };
        }

        const {
            displayName,
            fileType,
            documentType = null,
            structureFingerprint,
            canonicalizationVersion,
            canonicalStructure
        } = sourceTemplateExact;

        const normalizedFileType =
            typeof fileType === "string"
                ? fileType.trim().toLowerCase()
                : "";

        if (!this.isNonEmptyString(displayName)) {
            return {
                status: "invalid",
                errorCode:
                    "display_name_invalid"
            };
        }

        if (
            !["csv", "excel"]
                .includes(normalizedFileType)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "file_type_invalid"
            };
        }

        if (
            documentType !== null &&
            !this.isNonEmptyString(documentType)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "document_type_invalid"
            };
        }

        if (
            typeof structureFingerprint !== "string" ||
            !/^[a-f0-9]{64}$/i.test(
                structureFingerprint.trim()
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "structure_fingerprint_invalid"
            };
        }

        if (
            !this.isNonEmptyString(
                canonicalizationVersion
            )
        ) {
            return {
                status: "invalid",
                errorCode:
                    "canonicalization_version_invalid"
            };
        }

        if (!this.isPlainObject(canonicalStructure)) {
            return {
                status: "invalid",
                errorCode:
                    "canonical_structure_invalid"
            };
        }

        return {
            status: "valid",

            validatedSourceTemplateExact: {
                displayName:
                    displayName.trim(),

                fileType:
                    normalizedFileType,

                documentType:
                    documentType === null
                        ? null
                        : documentType.trim(),

                structureFingerprint:
                    structureFingerprint
                        .trim()
                        .toLowerCase(),

                canonicalizationVersion:
                    canonicalizationVersion.trim(),

                canonicalStructure
            }
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
}

module.exports =
    SourceTemplateExactPayloadValidator;
