'use strict';

class SourceFieldExtractor {
    extractExcelRows(document = {}) {
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
                this.findHeaderRowIndex(rows);

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

    findHeaderRowIndex(rows) {
        if (!Array.isArray(rows)) {
            return -1;
        }

        for (
            let rowIndex = 0;
            rowIndex < rows.length;
            rowIndex += 1
        ) {
            const row = rows[rowIndex];

            if (!Array.isArray(row)) {
                continue;
            }

            const values = row
                .map(value =>
                    this.normalizeHeader(value)
                )
                .filter(Boolean);

            if (
                values.includes('利用者名') &&
                (
                    values.includes('居室番号') ||
                    values.includes('性格') ||
                    values.includes('本人の意向')
                )
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
