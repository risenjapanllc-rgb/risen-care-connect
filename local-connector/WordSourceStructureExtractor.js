"use strict";

class WordSourceStructureExtractor {
    extractTablesFromMammothHtml(html) {
        if (
            typeof html !== "string" ||
            !html.trim()
        ) {
            return [];
        }

        const tables = [];

        const tableMatches =
            html.match(
                /<table\b[^>]*>[\s\S]*?<\/table>/gi
            ) || [];

        for (
            let tableIndex = 0;
            tableIndex < tableMatches.length;
            tableIndex += 1
        ) {
            const tableHtml =
                tableMatches[tableIndex];

            const rowMatches =
                tableHtml.match(
                    /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
                ) || [];

            const rows = [];

            for (
                let rowIndex = 0;
                rowIndex < rowMatches.length;
                rowIndex += 1
            ) {
                const rowHtml =
                    rowMatches[rowIndex];

                const cells = [];

                const cellPattern =
                    /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

                let match;

                while (
                    (
                        match =
                            cellPattern.exec(
                                rowHtml
                            )
                    ) !== null
                ) {
                    const attributes =
                        match[2] || "";

                    const cellHtml =
                        match[3] || "";

                    const colspanMatch =
                        attributes.match(
                            /colspan=["']?(\d+)/i
                        );

                    const rowspanMatch =
                        attributes.match(
                            /rowspan=["']?(\d+)/i
                        );

                    cells.push({
                        text:
                            this.htmlToText(
                                cellHtml
                            ),

                        colspan:
                            colspanMatch
                                ? Number(
                                    colspanMatch[1]
                                )
                                : 1,

                        rowspan:
                            rowspanMatch
                                ? Number(
                                    rowspanMatch[1]
                                )
                                : 1
                    });
                }

                rows.push(cells);
            }

            tables.push({
                tableIndex,
                rows
            });
        }

        return tables;
    }

    htmlToText(html) {
        if (
            typeof html !== "string" ||
            !html
        ) {
            return "";
        }

        return this.normalizeText(
            html
                .replace(
                    /<br\s*\/?\s*>/gi,
                    "\n"
                )
                .replace(
                    /<\/p\s*>/gi,
                    "\n"
                )
                .replace(
                    /<[^>]+>/g,
                    ""
                )
                .replace(
                    /&nbsp;/gi,
                    " "
                )
                .replace(
                    /&lt;/gi,
                    "<"
                )
                .replace(
                    /&gt;/gi,
                    ">"
                )
                .replace(
                    /&amp;/gi,
                    "&"
                )
                .replace(
                    /&quot;/gi,
                    '"'
                )
                .replace(
                    /&#39;/gi,
                    "'"
                )
        );
    }

    extractKeyValueContractsFromMammothHtml(
        html
    ) {
        const tables =
            this.extractTablesFromMammothHtml(
                html
            );

        const fieldDefinitions = [];
        const sourceFields = [];
        const sourceEntities = [];

        for (const table of tables) {
            const rows =
                table.rows.map(
                    row => {
                        if (
                            !Array.isArray(row) ||
                            row.length !== 2
                        ) {
                            return [];
                        }

                        const [
                            labelCell,
                            valueCell
                        ] = row;

                        if (
                            !labelCell ||
                            !valueCell ||
                            labelCell.colspan !== 1 ||
                            valueCell.colspan !== 1
                        ) {
                            return [];
                        }

                        return [
                            labelCell.text,
                            valueCell.text
                        ];
                    }
                );

            const extracted =
                this.extractKeyValueTable({
                    tableIndex:
                        table.tableIndex,
                    rows
                });

            fieldDefinitions.push(
                ...extracted.fieldDefinitions
            );

            sourceFields.push(
                ...extracted.sourceFields
            );

            sourceEntities.push(
                ...extracted.sourceEntities
            );
        }

        return {
            fieldDefinitions,
            sourceFields,
            sourceEntities
        };
    }

    extractKeyValueTable({
        tableIndex,
        rows
    } = {}) {
        if (
            !Number.isInteger(tableIndex) ||
            !Array.isArray(rows)
        ) {
            return {
                fieldDefinitions: [],
                sourceFields: [],
                sourceEntities: []
            };
        }

        const fieldDefinitions = [];
        const fields = {};
        const valuesBySourceFieldKey = {};

        for (
            let rowIndex = 0;
            rowIndex < rows.length;
            rowIndex += 1
        ) {
            const row = rows[rowIndex];

            if (
                !Array.isArray(row) ||
                row.length !== 2
            ) {
                continue;
            }

            const headerLabel =
                this.normalizeText(row[0]);

            const value =
                this.normalizeText(row[1]);

            if (!headerLabel) {
                continue;
            }

            const sourceFieldKey =
                `word:table:${tableIndex}:row:${rowIndex}`;

            fieldDefinitions.push({
                sourceFieldKey,
                headerLabel,
                tableIndex,
                rowIndex,
                labelCellIndex: 0,
                valueCellIndex: 1
            });

            fields[headerLabel] =
                value;

            valuesBySourceFieldKey[
                sourceFieldKey
            ] = value;
        }

        if (fieldDefinitions.length === 0) {
            return {
                fieldDefinitions: [],
                sourceFields: [],
                sourceEntities: []
            };
        }

        const sourceEntityKey =
            `word:table:${tableIndex}`;

        return {
            fieldDefinitions,

            sourceFields: [
                {
                    tableIndex,
                    fields
                }
            ],

            sourceEntities: [
                {
                    sourceEntityKey,
                    tableIndex,
                    fields,
                    valuesBySourceFieldKey
                }
            ]
        };
    }

    normalizeText(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .normalize("NFKC")
            .replace(/\s+/g, " ")
            .trim();
    }
}

module.exports =
    WordSourceStructureExtractor;
