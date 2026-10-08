"use strict";

const path =
    require("node:path");

const ConnectorCredentialStore =
    require(
        "./ConnectorCredentialStore"
    );

const ConnectorCredentialProvider =
    require(
        "./ConnectorCredentialProvider"
    );

function resolveDefaultHelperPath({
    platform =
        process.platform
} = {}) {
    if (platform === "darwin") {
        return path.resolve(
            __dirname,
            "..",
            "native",
            "macos",
            "risen-keychain-helper"
        );
    }

    if (platform === "win32") {
        return path.resolve(
            __dirname,
            "..",
            "native",
            "windows",
            "risen-credential-helper.exe"
        );
    }

    throw new Error(
        `unsupported credential platform: ${platform}`
    );
}

function createConnectorCredentialProvider({
    env = process.env,
    helperPath,
    platform =
        process.platform
} = {}) {
    const environmentHelperPath =
        typeof env
            .RISEN_CONNECTOR_CREDENTIAL_HELPER_PATH ===
            "string" &&
        env
            .RISEN_CONNECTOR_CREDENTIAL_HELPER_PATH
            .trim() !== ""
            ? env
                .RISEN_CONNECTOR_CREDENTIAL_HELPER_PATH
                .trim()
            : null;

    const resolvedHelperPath =
        helperPath ||
        environmentHelperPath ||
        resolveDefaultHelperPath({
            platform
        });

    const credentialStore =
        new ConnectorCredentialStore({
            helperPath:
                resolvedHelperPath
        });

    return new ConnectorCredentialProvider({
        env,
        credentialStore
    });
}

module.exports = {
    createConnectorCredentialProvider,
    resolveDefaultHelperPath
};
