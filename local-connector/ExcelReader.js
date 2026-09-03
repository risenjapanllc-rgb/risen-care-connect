const XLSX = require('xlsx');

class ExcelReader {
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
                                raw: false
                            }
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
