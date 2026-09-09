const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

class LocalConnectorConfig {
    constructor(options = {}) {
        this.configPath =
            options.configPath ||
            path.join(
                __dirname,
                '.local-connector-config.json'
            );
    }

    async getConnectorId() {
        let config = {};

        try {
            const text =
                await fs.readFile(
                    this.configPath,
                    'utf8'
                );

            config = JSON.parse(text);

        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        if (
            typeof config.connectorId === 'string' &&
            config.connectorId.trim()
        ) {
            return config.connectorId.trim();
        }

        const connectorId =
            crypto.randomUUID();

        config.connectorId =
            connectorId;

        await fs.writeFile(
            this.configPath,
            JSON.stringify(
                config,
                null,
                2
            ),
            {
                encoding: 'utf8',
                mode: 0o600
            }
        );

        return connectorId;
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

        let config = {};

        try {
            const text =
                await fs.readFile(
                    this.configPath,
                    'utf8'
                );

            config =
                JSON.parse(text);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        config.allowedFolder =
            resolvedPath;

        config.registeredAt =
            new Date().toISOString();

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
