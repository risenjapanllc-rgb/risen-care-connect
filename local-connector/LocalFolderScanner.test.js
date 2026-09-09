'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const LocalFolderScanner =
    require('./LocalFolderScanner');

test('scans supported files in nested folders', async () => {
    const root =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                'risen-local-scanner-'
            )
        );

    try {
        await fs.mkdir(
            path.join(root, '個別支援計画'),
            { recursive: true }
        );

        await fs.mkdir(
            path.join(
                root,
                '支援記録',
                '2026年9月'
            ),
            { recursive: true }
        );

        await fs.writeFile(
            path.join(
                root,
                '利用者一覧.xlsx'
            ),
            'test'
        );

        await fs.writeFile(
            path.join(
                root,
                '個別支援計画',
                '山田さん.docx'
            ),
            'test'
        );

        await fs.writeFile(
            path.join(
                root,
                '支援記録',
                '2026年9月',
                '山田さん.xlsx'
            ),
            'test'
        );

        await fs.writeFile(
            path.join(
                root,
                '関係ない.txt'
            ),
            'test'
        );

        const scanner =
            new LocalFolderScanner();

        const result =
            await scanner.scan(root);

        assert.strictEqual(
            result.fileCount,
            3
        );

        assert.deepStrictEqual(
            result.files.map(
                file => file.relativePath
            ).sort(),
            [
                '利用者一覧.xlsx',
                path.join(
                    '個別支援計画',
                    '山田さん.docx'
                ),
                path.join(
                    '支援記録',
                    '2026年9月',
                    '山田さん.xlsx'
                )
            ].sort()
        );

        assert.ok(
            result.files.every(
                file =>
                    file.relativePath !== file.fileName ||
                    file.fileName === '利用者一覧.xlsx'
            )
        );
    } finally {
        await fs.rm(
            root,
            {
                recursive: true,
                force: true
            }
        );
    }
});
