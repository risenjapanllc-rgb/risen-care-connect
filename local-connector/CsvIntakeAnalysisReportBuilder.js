"use strict";

/**
 * Projects CSV intake observations into a versioned
 * human-review report contract.
 *
 * This builder does not infer semantic or business meaning.
 * Raw CSV text and unknown inspection fields are excluded.
 */
class CsvIntakeAnalysisReportBuilder {
    copyArray(value) {
        return Array.isArray(value)
            ? [...value]
            : value;
    }

    projectDelimiterCandidates(value) {
        if (!Array.isArray(value)) {
            return value;
        }

        return value.map(candidate => ({
            delimiter:
                candidate.delimiter,
            rowCount:
                candidate.rowCount,
            columnCounts:
                this.copyArray(
                    candidate.columnCounts
                ),
            modeColumnCount:
                candidate.modeColumnCount,
            consistentRowCount:
                candidate.consistentRowCount,
            consistencyRatio:
                candidate.consistencyRatio
        }));
    }

    projectRowShape(value) {
        if (value === null) {
            return null;
        }

        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return value;
        }

        return {
            rowCount:
                value.rowCount,
            nonBlankRowCount:
                value.nonBlankRowCount,
            blankRowCount:
                value.blankRowCount,
            columnCountFrequencies:
                Array.isArray(
                    value.columnCountFrequencies
                )
                    ? value.columnCountFrequencies.map(
                        entry => ({
                            columnCount:
                                entry.columnCount,
                            rowCount:
                                entry.rowCount
                        })
                    )
                    : value.columnCountFrequencies,
            modeColumnCount:
                value.modeColumnCount,
            consistentRowCount:
                value.consistentRowCount,
            consistencyRatio:
                value.consistencyRatio,
            shapeConfidence:
                value.shapeConfidence,
            irregularRows:
                Array.isArray(value.irregularRows)
                    ? value.irregularRows.map(
                        row => ({
                            rowIndex:
                                row.rowIndex,
                            columnCount:
                                row.columnCount
                        })
                    )
                    : value.irregularRows
        };
    }

    projectHeaderCandidate(value) {
        if (value === null) {
            return null;
        }

        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            return value;
        }

        return {
            rowIndex:
                value.rowIndex,
            columnCount:
                value.columnCount,
            confidence:
                value.confidence
        };
    }

    projectColumnObservations(value) {
        if (value === null) {
            return null;
        }

        if (!Array.isArray(value)) {
            return value;
        }

        return value.map(observation => ({
            columnIndex:
                observation.columnIndex,
            headerValue:
                observation.headerValue,
            nonBlankValueCount:
                observation.nonBlankValueCount,
            blankValueCount:
                observation.blankValueCount,
            missingCellCount:
                observation.missingCellCount,
            sampleValues:
                this.copyArray(
                    observation.sampleValues
                )
        }));
    }

    build(inspection) {
        if (
            !inspection ||
            typeof inspection !== "object" ||
            Array.isArray(inspection)
        ) {
            return null;
        }

        return {
            reportVersion:
                "csv-intake-v1",
            source: {
                byteSize:
                    inspection.byteSize
            },
            encoding: {
                selected:
                    inspection.encoding,
                confidence:
                    inspection.encodingConfidence,
                compatible:
                    this.copyArray(
                        inspection.compatibleEncodings
                    ),
                bom:
                    inspection.bom
            },
            delimiter: {
                selected:
                    inspection.delimiter,
                confidence:
                    inspection.delimiterConfidence,
                candidates:
                    this.projectDelimiterCandidates(
                        inspection.delimiterCandidates
                    )
            },
            structure: {
                rowShape:
                    this.projectRowShape(
                        inspection.rowShape
                    ),
                headerCandidate:
                    this.projectHeaderCandidate(
                        inspection.headerCandidate
                    ),
                columnObservations:
                    this.projectColumnObservations(
                        inspection.columnObservations
                    )
            }
        };
    }
}

module.exports =
    CsvIntakeAnalysisReportBuilder;
