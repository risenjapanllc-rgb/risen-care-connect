"use strict";

const assert =
    require("node:assert/strict");

const path =
    require("node:path");

const test =
    require("node:test");

const {
    createConnectorCredentialProvider,
    resolveDefaultHelperPath
} = require(
    "./ConnectorCredentialProviderFactory"
);

test(
    "selects macOS keychain helper on darwin",
    () => {
        const helperPath =
            resolveDefaultHelperPath({
                platform:
                    "darwin"
            });

        assert.strictEqual(
            helperPath,
            path.resolve(
                __dirname,
                "..",
                "native",
                "macos",
                "risen-keychain-helper"
            )
        );
    }
);

test(
    "selects Windows Credential Manager helper on win32",
    () => {
        const helperPath =
            resolveDefaultHelperPath({
                platform:
                    "win32"
            });

        assert.strictEqual(
            helperPath,
            path.resolve(
                __dirname,
                "..",
                "native",
                "windows",
                "risen-credential-helper.exe"
            )
        );
    }
);

test(
    "provider uses Windows helper path without changing provider contract",
    () => {
        const provider =
            createConnectorCredentialProvider({
                platform:
                    "win32",
                env: {}
            });

        assert.strictEqual(
            provider
                .credentialStore
                .helperPath,
            path.resolve(
                __dirname,
                "..",
                "native",
                "windows",
                "risen-credential-helper.exe"
            )
        );
    }
);

test(
    "explicit helper override remains higher priority than platform",
    () => {
        const provider =
            createConnectorCredentialProvider({
                platform:
                    "win32",
                env: {
                    RISEN_CONNECTOR_CREDENTIAL_HELPER_PATH:
                        "/tmp/custom-helper"
                }
            });

        assert.strictEqual(
            provider
                .credentialStore
                .helperPath,
            "/tmp/custom-helper"
        );
    }
);

test(
    "rejects unsupported platforms when no override exists",
    () => {
        assert.throws(
            () =>
                resolveDefaultHelperPath({
                    platform:
                        "linux"
                }),
            /unsupported credential platform/
        );
    }
);
