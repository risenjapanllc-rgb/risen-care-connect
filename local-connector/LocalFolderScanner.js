'use strict';

const fs = require('fs/promises');
const path = require('path');

const DEFAULT_ALLOWED_EXTENSIONS = new Set([
    '.xlsx',
    '.xls',
    '.docx'
]);

class LocalFolderScanner {
    constructor({
        allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS
    } = {}) {
        this.allowedExtensions =
            new Set(
                Array.from(allowedExtensions)
                    .map(extension =>
                        String(extension || '')
                            .trim()
                            .toLowerCase()
                    )
                    .filter(Boolean)
            );
    }

    async scan(folderPath) {
        const requestedPath =
            String(folderPath || '').trim();

        if (!requestedPath) {
            throw new Error(
                '参照するフォルダを指定してください'
            );
        }

        const rootPath =
            path.resolve(requestedPath);

        const rootStats =
            await fs.stat(rootPath);

        if (!rootStats.isDirectory()) {
            throw new Error(
                '指定されたパスはフォルダではありません'
            );
        }

        const entries =
            await fs.readdir(
                rootPath,
                {
                    withFileTypes: true
                }
            );

        const files = [];

        for (const entry of entries) {
            if (!entry.isFile()) {
                continue;
            }

            if (
                entry.name.startsWith('.') ||
                entry.name.startsWith('~$')
            ) {
                continue;
            }

            const extension =
                path.extname(entry.name)
                    .toLowerCase();

            if (
                !this.allowedExtensions.has(
                    extension
                )
            ) {
                continue;
            }

            const filePath =
                path.join(
                    rootPath,
                    entry.name
                );

            const stats =
                await fs.stat(filePath);

            files.push({
                fileName: entry.name,
                extension,
                relativePath: entry.name,
                size: stats.size,
                updatedAt:
                    stats.mtime.toISOString()
            });
        }

        files.sort((a, b) =>
            a.fileName.localeCompare(
                b.fileName,
                'ja'
            )
        );

        return {
            rootFolderName:
                path.basename(rootPath),
            fileCount: files.length,
            files
        };
    }
}

module.exports = LocalFolderScanner;
