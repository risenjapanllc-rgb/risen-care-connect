"use strict";

class SemanticEvidenceBuilder {
    buildForTabular({
        fieldDefinitions = [],
        sourceFields = [],
        sourceType = null,
        documentType = null
    } = {}) {
        if (!Array.isArray(fieldDefinitions)) {
            return [];
        }

        return fieldDefinitions.map(field => {
            const sourceFieldKey =
                typeof field?.sourceFieldKey === "string"
                    ? field.sourceFieldKey
                    : "";

            const headerLabel =
                typeof field?.headerLabel === "string"
                    ? field.headerLabel
                    : "";

            const sampleValues = [];
            const neighboringFields = new Set();

            for (const record of sourceFields) {
                const fields =
                    record &&
                    typeof record.fields === "object" &&
                    !Array.isArray(record.fields)
                        ? record.fields
                        : {};

                if (
                    headerLabel &&
                    Object.prototype.hasOwnProperty.call(
                        fields,
                        headerLabel
                    )
                ) {
                    const value =
                        this.normalizeValue(
                            fields[headerLabel]
                        );

                    if (
                        value &&
                        !sampleValues.includes(value)
                    ) {
                        sampleValues.push(value);
                    }

                    for (const [
                        neighboringLabel,
                        neighboringValue
                    ] of Object.entries(fields)) {
                        if (
                            neighboringLabel ===
                                headerLabel ||
                            !this.normalizeValue(
                                neighboringValue
                            )
                        ) {
                            continue;
                        }

                        neighboringFields.add(
                            neighboringLabel
                        );
                    }
                }

                if (sampleValues.length >= 5) {
                    break;
                }
            }

            return {
                sourceFieldKey,
                headerLabel,

                sourceType:
                    typeof sourceType === "string"
                        ? sourceType
                        : null,

                documentType:
                    typeof documentType === "string"
                        ? documentType
                        : null,

                sheetIndex:
                    Number.isInteger(
                        field?.sheetIndex
                    )
                        ? field.sheetIndex
                        : null,

                sheetName:
                    typeof field?.sheetName ===
                        "string"
                        ? field.sheetName
                        : null,

                columnIndex:
                    Number.isInteger(
                        field?.columnIndex
                    )
                        ? field.columnIndex
                        : null,

                sampleValues:
                    sampleValues.slice(0, 5),

                neighboringFields:
                    Array.from(
                        neighboringFields
                    ).slice(0, 12)
            };
        });
    }

    buildForWord({
        text,
        documentType = null
    } = {}) {
        const normalizedText =
            typeof text === "string"
                ? text
                    .replace(/\r\n/g, "\n")
                    .replace(/\r/g, "\n")
                    .trim()
                : "";

        const lines =
            normalizedText
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean);

        return {
            sourceType: "word",

            documentType:
                typeof documentType === "string"
                    ? documentType
                    : null,

            lineCount:
                lines.length,

            documentText:
                normalizedText.slice(
                    0,
                    12000
                ),

            lines:
                lines.slice(0, 300)
        };
    }

    normalizeValue(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .normalize("NFKC")
            .trim()
            .replace(/\s+/g, " ");
    }
}

module.exports =
    SemanticEvidenceBuilder;
