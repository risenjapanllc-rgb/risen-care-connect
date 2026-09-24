const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');

const ExcelReader = require(
    process.cwd() + '/local-connector/ExcelReader'
);

test('ExcelReader canonicalizes Excel Date cells independently of display format', async () => {
    const dir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'risen-excel-date-')
    );
    const file = path.join(dir, 'dates.xlsx');

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['生年月日', '有効期限', '最終更新日時'],
        [
            new Date(1984, 2, 27),
            new Date(2027, 2, 31),
            new Date(2026, 3, 23, 10, 38, 0)
        ]
    ]);

    ws.A2.z = 'm/d/yy';
    ws.B2.z = 'm/d/yy';
    ws.C2.z = 'm/d/yy h:mm';

    XLSX.utils.book_append_sheet(wb, ws, '利用者');
    XLSX.writeFile(wb, file);

    const result = await new ExcelReader().read(file);
    const row = result.sheets[0].rows[1];

    assert.equal(row[0], '1984/03/27');
    assert.equal(row[1], '2027/03/31');
    assert.equal(row[2], '2026/04/23 10:38');

    fs.rmSync(dir, {
        recursive: true,
        force: true
    });
});
