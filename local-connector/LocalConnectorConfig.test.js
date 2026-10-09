"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const LocalConnectorConfig =
    require("./LocalConnectorConfig");

async function createTempConfigPath() {
    const directory =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                "risen-local-connector-"
            )
        );

    return {
        directory,
        configPath:
            path.join(
                directory,
                ".local-connector-config.json"
            )
    };
}

test(
    "getConnectorId creates and persists a UUID for a new config",
    async () => {
        const {
            directory,
            configPath
        } = await createTempConfigPath();

        try {
            const config =
                new LocalConnectorConfig({
                    configPath
                });

            const connectorId =
                await config.getConnectorId();

            assert.match(
                connectorId,
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );

            const saved =
                JSON.parse(
                    await fs.readFile(
                        configPath,
                        "utf8"
                    )
                );

            assert.strictEqual(
                saved.connectorId,
                connectorId
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "getConnectorId returns the same ID on subsequent calls",
    async () => {
        const {
            directory,
            configPath
        } = await createTempConfigPath();

        try {
            const config =
                new LocalConnectorConfig({
                    configPath
                });

            const first =
                await config.getConnectorId();

            const second =
                await config.getConnectorId();

            assert.strictEqual(
                second,
                first
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "getConnectorId preserves an existing allowedFolder",
    async () => {
        const {
            directory,
            configPath
        } = await createTempConfigPath();

        try {
            const allowedFolder =
                path.join(
                    directory,
                    "documents"
                );

            await fs.mkdir(
                allowedFolder
            );

            await fs.writeFile(
                configPath,
                JSON.stringify(
                    {
                        allowedFolder,
                        registeredAt:
                            "2026-09-08T07:25:44.604325+00:00"
                    },
                    null,
                    2
                ),
                "utf8"
            );

            const config =
                new LocalConnectorConfig({
                    configPath
                });

            const connectorId =
                await config.getConnectorId();

            const saved =
                JSON.parse(
                    await fs.readFile(
                        configPath,
                        "utf8"
                    )
                );

            assert.strictEqual(
                saved.connectorId,
                connectorId
            );

            assert.strictEqual(
                saved.allowedFolder,
                allowedFolder
            );

            assert.strictEqual(
                saved.registeredAt,
                "2026-09-08T07:25:44.604325+00:00"
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "getConnectorId preserves an existing connectorId",
    async () => {
        const {
            directory,
            configPath
        } = await createTempConfigPath();

        try {
            const existingConnectorId =
                "11111111-2222-4333-8444-555555555555";

            await fs.writeFile(
                configPath,
                JSON.stringify(
                    {
                        connectorId:
                            existingConnectorId,
                        allowedFolder:
                            "/tmp/documents",
                        registeredAt:
                            "2026-09-08T07:25:44.604325+00:00"
                    },
                    null,
                    2
                ),
                "utf8"
            );

            const config =
                new LocalConnectorConfig({
                    configPath
                });

            const connectorId =
                await config.getConnectorId();

            assert.strictEqual(
                connectorId,
                existingConnectorId
            );

            const saved =
                JSON.parse(
                    await fs.readFile(
                        configPath,
                        "utf8"
                    )
                );

            assert.strictEqual(
                saved.connectorId,
                existingConnectorId
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "saveAllowedFolder preserves an existing connectorId",
    async () => {
        const {
            directory,
            configPath
        } = await createTempConfigPath();

        try {
            const allowedFolder =
                path.join(
                    directory,
                    "documents"
                );

            await fs.mkdir(
                allowedFolder
            );

            const existingConnectorId =
                "11111111-2222-4333-8444-555555555555";

            await fs.writeFile(
                configPath,
                JSON.stringify(
                    {
                        connectorId:
                            existingConnectorId
                    },
                    null,
                    2
                ),
                "utf8"
            );

            const config =
                new LocalConnectorConfig({
                    configPath
                });

            await config.saveAllowedFolder(
                allowedFolder
            );

            const saved =
                JSON.parse(
                    await fs.readFile(
                        configPath,
                        "utf8"
                    )
                );

            assert.strictEqual(
                saved.connectorId,
                existingConnectorId
            );

            assert.strictEqual(
                saved.allowedFolder,
                path.resolve(
                    allowedFolder
                )
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "saveMySqlSource persists non-secret MySQL configuration",
    async () => {
        const directory =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "risen-mysql-config-"
                )
            );

        const configPath =
            path.join(
                directory,
                "config.json"
            );

        try {
            const config =
                new LocalConnectorConfig({
                    configPath
                });

            const saved =
                await config.saveMySqlSource({
                    sourceId:
                        "mysql-source-1",
                    host:
                        "192.168.1.20",
                    port:
                        3307,
                    user:
                        "reader",
                    database:
                        "facility",
                    query:
                        "SELECT * FROM residents",
                    identityField:
                        "resident_code",
                    residentCodeField:
                        "resident_code",
                    residentNameField:
                        "name",
                    birthDateField:
                        "birth_date"
                });

            assert.equal(
                saved.sourceId,
                "mysql-source-1"
            );

            const reloaded =
                new LocalConnectorConfig({
                    configPath
                });

            assert.deepEqual(
                await reloaded.getMySqlSource(),
                {
                    sourceId:
                        "mysql-source-1",
                    host:
                        "192.168.1.20",
                    port:
                        3307,
                    user:
                        "reader",
                    database:
                        "facility",
                    query:
                        "SELECT * FROM residents",
                    identityField:
                        "resident_code",
                    residentCodeField:
                        "resident_code",
                    residentNameField:
                        "name",
                    birthDateField:
                        "birth_date"
                }
            );

            const raw =
                await fs.readFile(
                    configPath,
                    "utf8"
                );

            assert.equal(
                raw.includes(
                    "password"
                ),
                false
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);

test(
    "getAllowedFolder returns null when config exists without file source",
    async () => {
        const directory =
            await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    "risen-no-file-source-"
                )
            );

        const configPath =
            path.join(
                directory,
                "config.json"
            );

        try {
            await fs.writeFile(
                configPath,
                JSON.stringify({
                    connectorId:
                        "connector-test",
                    mysqlSource: {
                        sourceId:
                            "mysql-test",
                        host:
                            "127.0.0.1",
                        port:
                            3306,
                        user:
                            "reader",
                        database:
                            "care",
                        query:
                            "SELECT 1"
                    }
                }),
                "utf8"
            );

            const config =
                new LocalConnectorConfig({
                    configPath
                });

            assert.equal(
                await config.getAllowedFolder(),
                null
            );
        } finally {
            await fs.rm(
                directory,
                {
                    recursive: true,
                    force: true
                }
            );
        }
    }
);
