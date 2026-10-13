"use strict";

const {
    createHash
} = require("node:crypto");

const CANONICALIZATION_VERSION =
    "risen-source-template-canonicalization-1";

const HASH_ALGORITHM =
    "sha256";

class SourceTemplateStructureFingerprint {
    generate({
        sourceType,
        fieldDefinitions
    } = {}) {
        const normalizedSourceType =
            typeof sourceType === "string"
                ? sourceType.trim().toLowerCase()
                : "";

        if (
            normalizedSourceType !== "csv" &&
            normalizedSourceType !== "excel"
        ) {
            return {
                status: "unsupported_source_type"
            };
        }

        if (
            !Array.isArray(fieldDefinitions) ||
            fieldDefinitions.length === 0
        ) {
            return {
                status: "invalid_structure"
            };
        }

        const normalizedFields = [];

        for (const field of fieldDefinitions) {
            if (
                !field ||
                typeof field !== "object" ||
                Array.isArray(field) ||
                !Number.isInteger(field.sheetIndex) ||
                field.sheetIndex < 0 ||
                !Number.isInteger(field.columnIndex) ||
                field.columnIndex < 0
            ) {
                return {
                    status: "invalid_structure"
                };
            }

            const headerLabel =
                this.normalizeLabel(
                    field.headerLabel
                );

            if (!headerLabel) {
                return {
                    status: "invalid_structure"
                };
            }

            const sheetName =
                this.normalizeLabel(
                    field.sheetName
                );

            if (
                normalizedSourceType === "excel" &&
                !sheetName
            ) {
                return {
                    status: "invalid_structure"
                };
            }

            normalizedFields.push({
                sheetIndex:
                    field.sheetIndex,
                sheetName,
                columnIndex:
                    field.columnIndex,
                headerLabel
            });
        }

        normalizedFields.sort(
            (left, right) =>
                left.sheetIndex -
                    right.sheetIndex ||
                left.columnIndex -
                    right.columnIndex
        );

        const occupiedPositions =
            new Set();

        for (const field of normalizedFields) {
            const positionKey =
                `${field.sheetIndex}:${field.columnIndex}`;

            if (
                occupiedPositions.has(
                    positionKey
                )
            ) {
                return {
                    status: "invalid_structure"
                };
            }

            occupiedPositions.add(
                positionKey
            );
        }

        const canonicalStructure =
            normalizedSourceType === "csv"
                ? this.createCsvCanonicalStructure(
                    normalizedFields
                )
                : this.createExcelCanonicalStructure(
                    normalizedFields
                );

        if (
            canonicalStructure?.invalid === true
        ) {
            return {
                status: "invalid_structure"
            };
        }

        const canonicalJson =
            JSON.stringify(
                canonicalStructure
            );

        const fingerprint =
            createHash(
                HASH_ALGORITHM
            )
                .update(
                    canonicalJson,
                    "utf8"
                )
                .digest("hex");

        return {
            status: "generated",
            canonicalizationVersion:
                CANONICALIZATION_VERSION,
            hashAlgorithm:
                HASH_ALGORITHM,
            canonicalStructure,
            canonicalJson,
            fingerprint
        };
    }

    normalizeLabel(value) {
        if (typeof value !== "string") {
            return "";
        }

        return value
            .normalize("NFKC")
            .trim()
            .replace(/\s+/gu, " ");
    }

    createCsvCanonicalStructure(
        fields
    ) {
        return {
            type: "csv",
            fields:
                fields.map(field => ({
                    columnIndex:
                        field.columnIndex,
                    headerLabel:
                        field.headerLabel
                }))
        };
    }

    createExcelCanonicalStructure(
        fields
    ) {
        const sheets =
            new Map();

        for (const field of fields) {
            if (
                !sheets.has(
                    field.sheetIndex
                )
            ) {
                sheets.set(
                    field.sheetIndex,
                    {
                        sheetIndex:
                            field.sheetIndex,
                        sheetName:
                            field.sheetName,
                        fields: []
                    }
                );
            }

            const sheet =
                sheets.get(
                    field.sheetIndex
                );

            if (
                sheet.sheetName !==
                field.sheetName
            ) {
                return {
                    invalid: true
                };
            }

            sheet.fields.push({
                columnIndex:
                    field.columnIndex,
                headerLabel:
                    field.headerLabel
            });
        }

        return {
            type: "excel",
            sheets:
                Array.from(
                    sheets.values()
                )
        };
    }
}

SourceTemplateStructureFingerprint
    .CANONICALIZATION_VERSION =
        CANONICALIZATION_VERSION;

SourceTemplateStructureFingerprint
    .HASH_ALGORITHM =
        HASH_ALGORITHM;

module.exports =
    SourceTemplateStructureFingerprint;
