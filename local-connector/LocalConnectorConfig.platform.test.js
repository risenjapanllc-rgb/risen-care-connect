"use strict";

const assert =
    require("node:assert/strict");

const path =
    require("node:path");

const test =
    require("node:test");

const LocalConnectorConfig =
    require("./LocalConnectorConfig");

test(
    "uses macOS Application Support by default",
    () => {
        assert.strictEqual(
            LocalConnectorConfig
                .resolveDefaultConfigPath({
                    platform: "darwin",
                    homeDirectory:
                        "/Users/example"
                }),
            path.join(
                "/Users/example",
                "Library",
                "Application Support",
                "RISEN CARE Connector",
                "config.json"
            )
        );
    }
);

test(
    "uses LOCALAPPDATA on Windows",
    () => {
        assert.strictEqual(
            LocalConnectorConfig
                .resolveDefaultConfigPath({
                    platform: "win32",
                    homeDirectory:
                        "C:\\Users\\example",
                    localAppData:
                        "C:\\Users\\example\\AppData\\Local"
                }),
            path.join(
                "C:\\Users\\example\\AppData\\Local",
                "RISEN CARE",
                "Connector",
                "config.json"
            )
        );
    }
);

test(
    "keeps explicit config path highest priority",
    () => {
        const config =
            new LocalConnectorConfig({
                configPath:
                    "/tmp/risen-config.json",
                platform:
                    "win32",
                localAppData:
                    "C:\\ignored"
            });

        assert.strictEqual(
            config.configPath,
            "/tmp/risen-config.json"
        );
    }
);

test(
    "uses the standard RISEN CARE inbox on macOS",
    () => {
        assert.strictEqual(
            LocalConnectorConfig
                .resolveDefaultInboxPath({
                    platform:
                        "darwin",
                    homeDirectory:
                        "/Users/example"
                }),
            path.join(
                "/Users/example",
                "Documents",
                "RISEN CARE connect",
                "inbox"
            )
        );
    }
);

test(
    "uses the standard RISEN CARE inbox on Windows",
    () => {
        assert.strictEqual(
            LocalConnectorConfig
                .resolveDefaultInboxPath({
                    platform:
                        "win32",
                    homeDirectory:
                        "C:\\Users\\example"
                }),
            path.win32.join(
                "C:\\Users\\example",
                "Documents",
                "RISEN CARE connect",
                "inbox"
            )
        );
    }
);

test(
    "uses Documents RISEN CARE connect inbox as default import folder",
    () => {
        assert.strictEqual(
            LocalConnectorConfig
                .resolveDefaultInboxPath({
                    homeDirectory:
                        "/Users/example"
                }),
            path.join(
                "/Users/example",
                "Documents",
                "RISEN CARE connect",
                "inbox"
            )
        );
    }
);
