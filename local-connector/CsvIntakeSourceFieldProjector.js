"use strict";

/**
 * Projects physical CSV intake column observations into
 * the existing source-field identity contract.
 *
 * This projector does not infer semantic or business meaning.
 */
class CsvIntakeSourceFieldProjector {
    project(report) {
        if (
            !report ||
            typeof report !== "object" ||
            Array.isArray(report) ||
            report.reportVersion !== "csv-intake-v1"
        ) {
            throw new Error(
                "unsupported CSV intake report version"
            );
        }

        const structure = report.structure;

        if (
            !structure ||
            typeof structure !== "object" ||
            Array.isArray(structure) ||
            structure.headerCandidate === null ||
            structure.columnObservations === null
        ) {
            return [];
        }

        if (
            !Array.isArray(
                structure.columnObservations
            )
        ) {
            return [];
        }

        const headerCandidate =
            structure.headerCandidate;

        if (
            !headerCandidate ||
            typeof headerCandidate !== "object" ||
            Array.isArray(headerCandidate) ||
            !Number.isInteger(
                headerCandidate.columnCount
            ) ||
            headerCandidate.columnCount <= 0 ||
            structure.columnObservations.length !==
                headerCandidate.columnCount
        ) {
            throw new Error(
                "inconsistent CSV intake structure"
            );
        }

        const seenColumnIndexes =
            new Set();

        for (
            const observation of
                structure.columnObservations
        ) {
            if (
                !observation ||
                typeof observation !== "object" ||
                Array.isArray(observation) ||
                !Number.isInteger(
                    observation.columnIndex
                ) ||
                observation.columnIndex < 0
            ) {
                throw new Error(
                    "invalid CSV intake column observation"
                );
            }

            if (
                observation.columnIndex >=
                    headerCandidate.columnCount ||
                seenColumnIndexes.has(
                    observation.columnIndex
                )
            ) {
                throw new Error(
                    "inconsistent CSV intake column identity"
                );
            }

            seenColumnIndexes.add(
                observation.columnIndex
            );
        }

        return structure.columnObservations.map(
            observation => {
                const columnIndex =
                    observation.columnIndex;

                return {
                    sourceFieldKey:
                        `sheet:0:column:${columnIndex}`,
                    sheetIndex: 0,
                    sheetName: "",
                    columnIndex,
                    headerLabel:
                        observation.headerValue
                };
            }
        );
    }
}

module.exports =
    CsvIntakeSourceFieldProjector;
