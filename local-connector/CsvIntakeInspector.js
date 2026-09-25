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
                delimiterObservation.candidates
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
