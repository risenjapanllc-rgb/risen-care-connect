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

function createConnectorCredentialProvider({
    env = process.env,
    helperPath
} = {}) {
    const resolvedHelperPath =
        helperPath ||
        path.resolve(
            __dirname,
            "..",
            "native",
            "macos",
            "risen-keychain-helper"
        );

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
    createConnectorCredentialProvider
};
