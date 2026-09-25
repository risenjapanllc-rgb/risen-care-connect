'use strict';

class SourceFieldExtractor {
    extractExcelRows(
        document = {},
        options = {}
    ) {
        if (
            !document ||
            typeof document !== 'object' ||
            !Array.isArray(document.sheets)
        ) {
            return [];
        }

        const results = [];
        const seenBySheet = new Map();

        for (const sheet of document.sheets) {
            if (
                !sheet ||
                typeof sheet !== 'object' ||
                !Array.isArray(sheet.rows)
            ) {
                continue;
            }

            const rows = sheet.rows;

            const headerIndex =
                this.resolveHeaderRowIndex(
                    rows,
                    options
                );

            if (headerIndex === -1) {
                continue;
            }

            const headers =
                rows[headerIndex].map(value =>
                    this.normalizeHeader(value)
                );

            let carriedValues = [];

            for (
                let rowIndex = headerIndex + 1;
                rowIndex < rows.length;
                rowIndex += 1
            ) {
                const row = rows[rowIndex];

                if (!Array.isArray(row)) {
                    continue;
                }

                /*
                 * 完全な空行は利用者データではない。
                 * この段階でスキップすることで、
                 * 直前行の値を引き継がない。
                 */
                const rowHasValue =
                    row.some(value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ''
                    );

                if (!rowHasValue) {
                    continue;
                }

                const fields = {};

                headers.forEach(
                    (header, columnIndex) => {
                        if (!header) {
                            return;
                        }

                        let value =
                            row[columnIndex] === null ||
                            row[columnIndex] === undefined
                                ? ''
                                : String(
                                    row[columnIndex]
                                ).trim();

                        /*
                         * 結合セル等で空欄になっている場合、
                         * 直前の値を論理的に引き継ぐ。
                         */
                        if (
                            value === '' &&
                            carriedValues[columnIndex]
                        ) {
                            value =
                                carriedValues[columnIndex];
                        }

                        if (value !== '') {
                            carriedValues[columnIndex] =
                                value;
                        }

                        fields[header] = value;
                    }
                );

                /*
                 * データ行かどうかを判定する。
                 *
                 * ヘッダー名そのものが再登場する行や、
                 * 完全な空行はデータとして扱わない。
                 */
                if (
                    this.isHeaderLikeRow(
                        fields,
                        headers
                    )
                ) {
                    continue;
                }

                const hasValue =
                    Object.values(fields).some(
                        value => value !== ''
                    );

                if (!hasValue) {
                    continue;
                }

                const sheetName =
                    typeof sheet.sheetName === 'string'
                        ? sheet.sheetName
                        : '';

                if (!seenBySheet.has(sheetName)) {
                    seenBySheet.set(
                        sheetName,
                        new Set()
                    );
                }

                const duplicateKey =
                    JSON.stringify(fields);

                const seen =
                    seenBySheet.get(sheetName);

                if (seen.has(duplicateKey)) {
                    continue;
                }

                seen.add(duplicateKey);

                results.push({
                    sheetName,
                    rowIndex: rowIndex + 1,
                    fields
                });
            }
        }

        return results;
    }

    extractSourceEntities(
        document = {},
        options = {}
    ) {
        if (
            !document ||
            typeof document !== 'object' ||
            !Array.isArray(document.sheets)
        ) {
            return [];
        }

        const results = [];

        document.sheets.forEach(
            (sheet, sheetIndex) => {
                if (
                    !sheet ||
                    typeof sheet !== 'object' ||
                    !Array.isArray(sheet.rows)
                ) {
                    return;
                }

                const rows = sheet.rows;
                const headerIndex =
                    this.resolveHeaderRowIndex(
                        rows,
                        options
                    );

                if (headerIndex === -1) {
                    return;
                }

                const headers =
                    rows[headerIndex].map(value =>
                        this.normalizeHeader(value)
                    );

                const sheetName =
                    typeof sheet.sheetName === 'string'
                        ? sheet.sheetName
                        : '';

                for (
                    let rowIndex = headerIndex + 1;
                    rowIndex < rows.length;
                    rowIndex += 1
                ) {
                    const row = rows[rowIndex];

                    if (!Array.isArray(row)) {
                        continue;
                    }

                    const rowHasValue =
                        row.some(value =>
                            value !== null &&
                            value !== undefined &&
                            String(value).trim() !== ''
                        );

                    if (!rowHasValue) {
                        continue;
                    }

                    const fields = {};
                    const valuesBySourceFieldKey = {};

                    headers.forEach(
                        (header, columnIndex) => {
                            if (!header) {
                                return;
                            }

                            const value =
                                row[columnIndex] === null ||
                                row[columnIndex] === undefined
                                    ? ''
                                    : String(
                                        row[columnIndex]
                                    ).trim();

                            fields[header] = value;

                            valuesBySourceFieldKey[
                                `sheet:${sheetIndex}:column:${columnIndex}`
                            ] = value;
                        }
                    );

                    if (
                        this.isHeaderLikeRow(
                            fields,
                            headers
                        )
                    ) {
                        continue;
                    }

                    const hasValue =
                        Object.values(fields).some(
                            value => value !== ''
                        );

                    if (!hasValue) {
                        continue;
                    }

                    results.push({
                        sourceEntityKey:
                            `sheet:${sheetIndex}:row:${rowIndex + 1}`,
                        sheetIndex,
                        sheetName,
                        rowIndex: rowIndex + 1,
                        fields,
                        valuesBySourceFieldKey
                    });
                }
            }
        );

        return results;
    }

    extractFieldDefinitions(
        document = {},
        options = {}
    ) {
        if (
            !document ||
            typeof document !== 'object' ||
            !Array.isArray(document.sheets)
        ) {
            return [];
        }

        const results = [];

        document.sheets.forEach(
            (sheet, sheetIndex) => {
                if (
                    !sheet ||
                    typeof sheet !== 'object' ||
                    !Array.isArray(sheet.rows)
                ) {
                    return;
                }

                const headerIndex =
                    this.resolveHeaderRowIndex(
                        sheet.rows,
                        options
                    );

                if (headerIndex === -1) {
                    return;
                }

                const headerRow =
                    sheet.rows[headerIndex];

                if (!Array.isArray(headerRow)) {
                    return;
                }

                const sheetName =
                    typeof sheet.sheetName === 'string'
                        ? sheet.sheetName
                        : '';

                headerRow.forEach(
                    (value, columnIndex) => {
                        const headerLabel =
                            this.normalizeHeader(value);

                        if (!headerLabel) {
                            return;
                        }

                        results.push({
                            sourceFieldKey:
                                `sheet:${sheetIndex}:column:${columnIndex}`,
                            sheetIndex,
                            sheetName,
                            columnIndex,
                            headerLabel
                        });
                    }
                );
            }
        );

        return results;
    }

    resolveHeaderRowIndex(
        rows,
        options = {}
    ) {
        if (!Array.isArray(rows)) {
            return -1;
        }

        const hasExplicitHeaderRowIndex =
            Object.prototype.hasOwnProperty.call(
                options,
                'headerRowIndex'
            );

        if (hasExplicitHeaderRowIndex) {
            if (
                !Number.isInteger(
                    options.headerRowIndex
                ) ||
                options.headerRowIndex < 0
            ) {
                return -1;
            }

            return options.headerRowIndex < rows.length
                ? options.headerRowIndex
                : -1;
        }

        return this.findHeaderRowIndex(rows);
    }

    findHeaderRowIndex(rows) {
        if (!Array.isArray(rows)) {
            return -1;
        }

        /*
         * ヘッダーは項目名の意味ではなく、
         * 表としての構造から判定する。
         *
         * 先頭付近の行について非空セル数を調べ、
         * 最も密度の高い行の50%以上を持つ
         * 最初の行をヘッダー候補とする。
         *
         * これにより、
         * - タイトル行を持つExcel
         * - 1行目から始まるCSV
         * - 利用者名など特定項目を持たない表
         * を同じルールで扱う。
         */
        const scanLimit =
            Math.min(rows.length, 20);

        const counts = [];

        for (
            let rowIndex = 0;
            rowIndex < scanLimit;
            rowIndex += 1
        ) {
            const row = rows[rowIndex];

            if (!Array.isArray(row)) {
                counts.push(0);
                continue;
            }

            const nonEmptyCount =
                row.filter(value =>
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ''
                ).length;

            counts.push(nonEmptyCount);
        }

        const maxCount =
            Math.max(0, ...counts);

        if (maxCount < 2) {
            return -1;
        }

        const minimumHeaderCells =
            Math.max(
                2,
                Math.ceil(maxCount * 0.5)
            );

        for (
            let rowIndex = 0;
            rowIndex < counts.length;
            rowIndex += 1
        ) {
            if (
                counts[rowIndex] >=
                minimumHeaderCells
            ) {
                return rowIndex;
            }
        }

        return -1;
    }

    isHeaderLikeRow(fields, headers) {
        if (
            !fields ||
            !Array.isArray(headers)
        ) {
            return false;
        }

        const values =
            Object.values(fields)
                .filter(Boolean);

        if (values.length === 0) {
            return false;
        }

        const headerSet =
            new Set(
                headers.filter(Boolean)
            );

        const headerMatchCount =
            values.filter(value =>
                headerSet.has(value)
            ).length;

        return (
            headerMatchCount >= 2
        );
    }

    normalizeHeader(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return '';
        }

        return String(value).trim();
    }
}

module.exports = SourceFieldExtractor;
