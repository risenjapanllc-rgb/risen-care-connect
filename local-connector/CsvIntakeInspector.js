"use strict";

const fs = require("node:fs/promises");
const CsvReader = require("./CsvReader");

class CsvIntakeInspector {
    constructor({
        csvReader = new CsvReader()
    } = {}) {
        this.csvReader = csvReader;
    }
    async inspect(filePath) {
        if (
            typeof filePath !== "string" ||
            filePath.trim() === ""
        ) {
            throw new Error(
                "CSV file is required"
            );
        }

        const buffer =
            await fs.readFile(filePath);

        const encodingObservation =
            this.inspectEncoding(buffer);

        const text =
            new TextDecoder(
                encodingObservation.selected,
                { fatal: true }
            ).decode(buffer);

        const bom =
            buffer.length >= 3 &&
            buffer[0] === 0xef &&
            buffer[1] === 0xbb &&
            buffer[2] === 0xbf
                ? "utf-8"
                : null;

        const delimiterObservation =
            this.inspectDelimiter(text);

        const rows =
            delimiterObservation.selected === null
                ? null
                : this.csvReader.parse(
                    text,
                    {
                        delimiter:
                            delimiterObservation.selected
                    }
                );

        const rowShape =
            rows === null
                ? null
                : this.inspectRowShape(
                    rows
                );

        const headerCandidate =
            rows === null ||
            rowShape === null
                ? null
                : this.inspectHeaderCandidate(
                    rows,
                    rowShape
                );

        const columnObservations =
            rows === null ||
            rowShape === null ||
            headerCandidate === null
                ? null
                : this.inspectColumnObservations(
                    rows,
                    rowShape,
                    headerCandidate
                );

        return {
            encoding:
                encodingObservation.selected,
            encodingConfidence:
                encodingObservation.confidence,
            compatibleEncodings:
                encodingObservation.compatible,
            bom,
            byteSize: buffer.length,
            text,
            delimiter:
                delimiterObservation.selected,
            delimiterConfidence:
                delimiterObservation.confidence,
            delimiterCandidates:
                delimiterObservation.candidates,
            rowShape,
            headerCandidate,
            columnObservations
        };
    }

    inspectDelimiter(text) {
        if (typeof text !== "string") {
            throw new TypeError(
                "CSV text is required"
            );
        }

        const delimiters = [
            ",",
            "\t",
            ";"
        ];

        const candidates =
            delimiters.map(delimiter => {
                const rows =
                    this.csvReader.parse(
                        text,
                        { delimiter }
                    );

                const columnCounts =
                    rows.map(
                        row => row.length
                    );

                const frequencies =
                    new Map();

                for (
                    const count of columnCounts
                ) {
                    frequencies.set(
                        count,
                        (
                            frequencies.get(count) ||
                            0
                        ) + 1
                    );
                }

                let modeColumnCount = 0;
                let consistentRowCount = 0;

                for (
                    const [
                        count,
                        frequency
                    ] of frequencies
                ) {
                    if (
                        frequency >
                            consistentRowCount ||
                        (
                            frequency ===
                                consistentRowCount &&
                            count >
                                modeColumnCount
                        )
                    ) {
                        modeColumnCount = count;
                        consistentRowCount =
                            frequency;
                    }
                }

                const rowCount =
                    rows.length;

                return {
                    delimiter,
                    rowCount,
                    columnCounts,
                    modeColumnCount,
                    consistentRowCount,
                    consistencyRatio:
                        rowCount === 0
                            ? 0
                            : (
                                consistentRowCount /
                                rowCount
                            )
                };
            });

        const viable =
            candidates.filter(
                candidate =>
                    candidate.modeColumnCount > 1
            );

        if (viable.length === 0) {
            return {
                selected: null,
                confidence: "undetermined",
                candidates
            };
        }

        const ranked =
            [...viable].sort(
                (left, right) =>
                    right.consistencyRatio -
                        left.consistencyRatio ||
                    right.modeColumnCount -
                        left.modeColumnCount
            );

        const best =
            ranked[0];

        const tied =
            ranked.filter(
                candidate =>
                    candidate.consistencyRatio ===
                        best.consistencyRatio &&
                    candidate.modeColumnCount ===
                        best.modeColumnCount
            );

        return {
            selected:
                tied.length === 1
                    ? best.delimiter
                    : null,
            confidence:
                tied.length === 1
                    ? "structural"
                    : "ambiguous",
            candidates
        };
    }

    inspectColumnObservations(
        rows,
        rowShape,
        headerCandidate,
        { sampleLimit = 3 } = {}
    ) {
        if (
            !Array.isArray(rows) ||
            rows.some(
                row => !Array.isArray(row)
            ) ||
            rowShape === null ||
            typeof rowShape !== "object"
        ) {
            throw new TypeError(
                "CSV row-shape evidence is required"
            );
        }

        if (headerCandidate === null) {
            return null;
        }

        if (
            typeof headerCandidate !== "object" ||
            !Number.isInteger(
                headerCandidate.rowIndex
            ) ||
            headerCandidate.rowIndex < 0 ||
            !Number.isInteger(
                headerCandidate.columnCount
            ) ||
            headerCandidate.columnCount <= 0 ||
            headerCandidate.confidence !==
                "candidate" ||
            !Number.isInteger(sampleLimit) ||
            sampleLimit < 0
        ) {
            throw new TypeError(
                "CSV header candidate is required"
            );
        }

        const headerRow =
            rows[headerCandidate.rowIndex];

        if (
            !Array.isArray(headerRow) ||
            headerRow.length !==
                headerCandidate.columnCount
        ) {
            throw new TypeError(
                "CSV header candidate is inconsistent"
            );
        }

        const dataRows =
            rows.slice(
                headerCandidate.rowIndex + 1
            );

        return headerRow.map(
            (headerValue, columnIndex) => {
                let nonBlankValueCount = 0;
                let blankValueCount = 0;
                let missingCellCount = 0;
                const sampleValues = [];

                for (const row of dataRows) {
                    const value =
                        row[columnIndex];

                    if (value === undefined) {
                        missingCellCount += 1;
                        continue;
                    }

                    if (value === "") {
                        blankValueCount += 1;
                        continue;
                    }

                    nonBlankValueCount += 1;

                    if (
                        sampleValues.length <
                            sampleLimit
                    ) {
                        sampleValues.push(value);
                    }
                }

                return {
                    columnIndex,
                    headerValue,
                    nonBlankValueCount,
                    blankValueCount,
                    missingCellCount,
                    sampleValues
                };
            }
        );
    }

    inspectHeaderCandidate(
        rows,
        rowShape
    ) {
        if (
            !Array.isArray(rows) ||
            rows.some(
                row => !Array.isArray(row)
            ) ||
            rowShape === null ||
            typeof rowShape !== "object"
        ) {
            throw new TypeError(
                "CSV row-shape evidence is required"
            );
        }

        if (
            rowShape.shapeConfidence !==
                "structural" ||
            !Number.isInteger(
                rowShape.modeColumnCount
            ) ||
            rowShape.modeColumnCount <= 0
        ) {
            return null;
        }

        const firstNonBlankRowIndex =
            rows.findIndex(
                row =>
                    !row.every(
                        value =>
                            value === ""
                    )
            );

        if (
            firstNonBlankRowIndex === -1
        ) {
            return null;
        }

        const firstNonBlankRow =
            rows[firstNonBlankRowIndex];

        if (
            firstNonBlankRow.length !==
                rowShape.modeColumnCount
        ) {
            return null;
        }

        return {
            rowIndex:
                firstNonBlankRowIndex,
            columnCount:
                firstNonBlankRow.length,
            confidence: "candidate"
        };
    }

    inspectRowShape(rows) {
        if (
            !Array.isArray(rows) ||
            rows.some(
                row => !Array.isArray(row)
            )
        ) {
            throw new TypeError(
                "CSV rows are required"
            );
        }

        const observedRows =
            rows.map(
                (row, rowIndex) => ({
                    rowIndex,
                    columnCount:
                        row.length,
                    blank:
                        row.every(
                            value =>
                                value === ""
                        )
                })
            );

        const nonBlankRows =
            observedRows.filter(
                row => !row.blank
            );

        const frequencies =
            new Map();

        for (
            const row of nonBlankRows
        ) {
            frequencies.set(
                row.columnCount,
                (
                    frequencies.get(
                        row.columnCount
                    ) ||
                    0
                ) + 1
            );
        }

        const columnCountFrequencies =
            [...frequencies.entries()]
                .map(
                    ([
                        columnCount,
                        rowCount
                    ]) => ({
                        columnCount,
                        rowCount
                    })
                )
                .sort(
                    (left, right) =>
                        right.rowCount -
                            left.rowCount ||
                        right.columnCount -
                            left.columnCount
                );

        const nonBlankRowCount =
            nonBlankRows.length;

        const highestFrequency =
            columnCountFrequencies[0]
                ?.rowCount ||
            0;

        const modes =
            columnCountFrequencies.filter(
                entry =>
                    entry.rowCount ===
                    highestFrequency
            );

        const shapeConfidence =
            nonBlankRowCount === 0
                ? "undetermined"
                : modes.length === 1
                    ? "structural"
                    : "ambiguous";

        const modeColumnCount =
            shapeConfidence === "structural"
                ? modes[0].columnCount
                : null;

        return {
            rowCount: rows.length,
            nonBlankRowCount,
            blankRowCount:
                rows.length -
                nonBlankRowCount,
            columnCountFrequencies,
            modeColumnCount,
            consistentRowCount:
                highestFrequency,
            consistencyRatio:
                nonBlankRowCount === 0
                    ? 0
                    : (
                        highestFrequency /
                        nonBlankRowCount
                    ),
            shapeConfidence,
            irregularRows:
                modeColumnCount === null
                    ? []
                    : nonBlankRows
                        .filter(
                            row =>
                                row.columnCount !==
                                modeColumnCount
                        )
                        .map(
                            row => ({
                                rowIndex:
                                    row.rowIndex,
                                columnCount:
                                    row.columnCount
                            })
                        )
        };
    }

    inspectEncoding(buffer) {
        if (!Buffer.isBuffer(buffer)) {
            throw new TypeError(
                "CSV buffer is required"
            );
        }

        const candidates = [
            "utf-8",
            "shift_jis",
            "euc-jp"
        ];

        const compatible =
            candidates.filter(
                encoding => {
                    try {
                        new TextDecoder(
                            encoding,
                            { fatal: true }
                        ).decode(buffer);

                        return true;
                    } catch {
                        return false;
                    }
                }
            );

        if (compatible.length === 0) {
            throw new Error(
                "CSV encoding could not be determined"
            );
        }

        const hasUtf8Bom =
            buffer.length >= 3 &&
            buffer[0] === 0xef &&
            buffer[1] === 0xbb &&
            buffer[2] === 0xbf;

        if (
            hasUtf8Bom &&
            compatible.includes("utf-8")
        ) {
            return {
                selected: "utf-8",
                confidence: "bom",
                compatible
            };
        }

        return {
            selected: compatible[0],
            confidence:
                compatible.length === 1
                    ? "unique"
                    : "ambiguous",
            compatible
        };
    }

    detectEncoding(buffer) {
        return this.inspectEncoding(
            buffer
        ).selected;
    }
}

module.exports = CsvIntakeInspector;
