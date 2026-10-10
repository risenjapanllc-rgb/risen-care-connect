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

    static resolveDefaultInboxPath({
        platform = process.platform,
        homeDirectory = os.homedir()
    } = {}) {
        const pathModule =
            platform === 'win32'
                ? path.win32
                : path;

        return pathModule.join(
            homeDirectory,
            'Documents',
            'RISEN CARE connect',
            'inbox'
        );
    }

    static resolveDefaultAllowedFolderPath({
        platform = process.platform,
        homeDirectory = os.homedir()
    } = {}) {
        return LocalConnectorConfig
            .resolveDefaultInboxPath({
                platform,
                homeDirectory
            });
    }

    constructor(options = {}) {
        this.platform =
            options.platform ||
            process.platform;

        this.homeDirectory =
            options.homeDirectory ||
            os.homedir();

        this.configPath =
            options.configPath ||
            process.env
                .RISEN_LOCAL_CONNECTOR_CONFIG_PATH ||
            LocalConnectorConfig
                .resolveDefaultConfigPath({
                    platform:
                        this.platform,
                    homeDirectory:
                        this.homeDirectory,
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

    async readConfig() {
        try {
            const text =
                await fs.readFile(
                    this.configPath,
                    'utf8'
                );

            return JSON.parse(text);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }

            throw error;
        }
    }

    async writeConfig(config) {
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
    }

    async saveMySqlSource({
        sourceId,
        host,
        port = 3306,
        user,
        database,
        query,
        identityField,
        residentCodeField,
        residentNameField,
        birthDateField
    } = {}) {
        const normalized = {
            sourceId:
                String(
                    sourceId ||
                    crypto.randomUUID()
                ).trim(),
            host:
                String(host || "").trim(),
            port:
                Number(port) || 3306,
            user:
                String(user || "").trim(),
            database:
                String(database || "").trim(),
            query:
                String(query || "").trim(),
            identityField:
                String(
                    identityField || ""
                ).trim(),
            residentCodeField:
                String(
                    residentCodeField || ""
                ).trim(),
            residentNameField:
                String(
                    residentNameField || ""
                ).trim(),
            birthDateField:
                String(
                    birthDateField || ""
                ).trim()
        };

        if (
            !normalized.host ||
            !normalized.user ||
            !normalized.database ||
            !normalized.query
        ) {
            throw new Error(
                'MySQL設定が不足しています'
            );
        }

        if (
            !Number.isInteger(
                normalized.port
            ) ||
            normalized.port <= 0 ||
            normalized.port > 65535
        ) {
            throw new Error(
                'MySQLポートが正しくありません'
            );
        }

        const config =
            await this.readConfig();

        config.mysqlSource =
            normalized;

        config.mysqlRegisteredAt =
            new Date().toISOString();

        await this.writeConfig(
            config
        );

        return {
            ...normalized,
            registeredAt:
                config.mysqlRegisteredAt
        };
    }

    async getMySqlSource() {
        const config =
            await this.readConfig();

        const source =
            config.mysqlSource;

        if (
            !source ||
            typeof source !== 'object'
        ) {
            return null;
        }

        if (
            !source.sourceId ||
            !source.host ||
            !source.user ||
            !source.database ||
            !source.query
        ) {
            return null;
        }

        return {
            sourceId:
                String(
                    source.sourceId
                ),
            host:
                String(
                    source.host
                ),
            port:
                Number(
                    source.port
                ) || 3306,
            user:
                String(
                    source.user
                ),
            database:
                String(
                    source.database
                ),
            query:
                String(
                    source.query
                ),
            identityField:
                typeof source.identityField ===
                    "string"
                    ? source.identityField.trim()
                    : "",
            residentCodeField:
                typeof source.residentCodeField ===
                    "string"
                    ? source.residentCodeField.trim()
                    : "",
            residentNameField:
                typeof source.residentNameField ===
                    "string"
                    ? source.residentNameField.trim()
                    : "",
            birthDateField:
                typeof source.birthDateField ===
                    "string"
                    ? source.birthDateField.trim()
                    : ""
        };
    }


    async ensureDefaultAllowedFolder() {
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

        if (
            typeof config.allowedFolder ===
                'string' &&
            config.allowedFolder.trim()
        ) {
            return config.allowedFolder.trim();
        }

        const defaultFolder =
            LocalConnectorConfig
                .resolveDefaultInboxPath({
                    platform:
                        this.platform,
                    homeDirectory:
                        this.homeDirectory
                });

        await fs.mkdir(
            defaultFolder,
            {
                recursive: true,
                mode: 0o700
            }
        );

        await this.saveAllowedFolder(
            defaultFolder
        );

        return defaultFolder;
    }

    async getAllowedFolder() {
        return await this
            .ensureDefaultAllowedFolder();
    }
}

module.exports = LocalConnectorConfig;
