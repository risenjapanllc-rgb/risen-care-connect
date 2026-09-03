const fs = require('fs/promises');
const path = require('path');

class LocalConnectorConfig {
    constructor(options = {}) {
        this.configPath =
            options.configPath ||
            path.join(
                __dirname,
                '.local-connector-config.json'
            );
    }

    async saveAllowedFolder(folderPath) {
        if (
            typeof folderPath !== 'string' ||
            !folderPath.trim()
        ) {
            throw new Error(
                '参照フォルダが指定されていません'
            );
        }

        const resolvedPath =
            path.resolve(folderPath.trim());

        const stats =
            await fs.stat(resolvedPath);

        if (!stats.isDirectory()) {
            throw new Error(
                '指定された場所はフォルダではありません'
            );
        }

        const config = {
            allowedFolder: resolvedPath,
            registeredAt:
                new Date().toISOString()
        };

        await fs.writeFile(
            this.configPath,
            JSON.stringify(config, null, 2),
            {
                encoding: 'utf8',
                mode: 0o600
            }
        );

        return {
            folderName:
                path.basename(resolvedPath),
            registeredAt:
                config.registeredAt
        };
    }

    async getAllowedFolder() {
        try {
            const text =
                await fs.readFile(
                    this.configPath,
                    'utf8'
                );

            const config =
                JSON.parse(text);

            if (
                !config.allowedFolder ||
                typeof config.allowedFolder !== 'string'
            ) {
                throw new Error(
                    '参照フォルダ設定が正しくありません'
                );
            }

            return config.allowedFolder;

        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }

            throw error;
        }
    }
}

module.exports = LocalConnectorConfig;
