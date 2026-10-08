const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class LocalConnectorConfig {
    static resolveDefaultConfigPath({
        platform = process.platform,
        homeDirectory = os.homedir(),
        localAppData = process.env.LOCALAPPDATA
    } = {}) {
        if (platform === 'darwin') {
            return path.join(
                homeDirectory,
                'Library',
                'Application Support',
                'RISEN CARE Connector',
                'config.json'
            );
        }

        if (platform === 'win32') {
            const baseDirectory =
                typeof localAppData === 'string' &&
                localAppData.trim()
                    ? localAppData.trim()
                    : path.join(
                        homeDirectory,
                        'AppData',
                        'Local'
                    );

            return path.join(
                baseDirectory,
                'RISEN CARE',
                'Connector',
                'config.json'
            );
        }

        return path.join(
            homeDirectory,
            '.config',
            'risen-care-connector',
            'config.json'
        );
    }

    constructor(options = {}) {
        this.configPath =
            options.configPath ||
            process.env
                .RISEN_LOCAL_CONNECTOR_CONFIG_PATH ||
            LocalConnectorConfig
                .resolveDefaultConfigPath({
                    platform:
                        options.platform ||
                        process.platform,
                    homeDirectory:
                        options.homeDirectory ||
                        os.homedir(),
                    localAppData:
                        options.localAppData ||
                        process.env.LOCALAPPDATA
                });
    }

    async ensureConfigDirectory() {
        await fs.mkdir(
            path.dirname(this.configPath),
            {
                recursive: true,
                mode: 0o700
            }
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

        await this.ensureConfigDirectory();

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

        await this.ensureConfigDirectory();

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
