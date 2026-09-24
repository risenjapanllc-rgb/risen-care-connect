const XLSX = require('xlsx');

class ExcelReader {
    formatDateCell(value) {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return value;
        }

        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');

        const date = `${year}/${month}/${day}`;

        const hours = value.getHours();
        const minutes = value.getMinutes();
        const seconds = value.getSeconds();

        if (hours === 0 && minutes === 0 && seconds === 0) {
            return date;
        }

        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');

        if (seconds === 0) {
            return `${date} ${hh}:${mm}`;
        }

        const ss = String(seconds).padStart(2, '0');
        return `${date} ${hh}:${mm}:${ss}`;
    }

    async read(filePath) {
        if (
            typeof filePath !== 'string' ||
            filePath.trim() === ''
        ) {
            throw new Error(
                'Excelファイルが指定されていません'
            );
        }

        const workbook = XLSX.readFile(
            filePath,
            {
                cellDates: true
            }
        );

        const sheets =
            workbook.SheetNames.map(
                sheetName => {
                    const worksheet =
                        workbook.Sheets[
                            sheetName
                        ];

                    const rows =
                        XLSX.utils.sheet_to_json(
                            worksheet,
                            {
                                header: 1,
                                defval: null,
                                raw: true
                            }
                        ).map(
                            row => row.map(
                                value =>
                                    this.formatDateCell(
                                        value
                                    )
                            )
                        );

                    return {
                        sheetName,
                        rows
                    };
                }
            );

        return {
            sheetNames: workbook.SheetNames,
            sheets
        };
    }
}

module.exports = ExcelReader;
