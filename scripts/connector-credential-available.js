"use strict";

require("dotenv").config({
    quiet: true,
    ...(typeof process.env.DOTENV_CONFIG_PATH === "string" &&
        process.env.DOTENV_CONFIG_PATH.trim() !== ""
        ? {
            path:
                process.env.DOTENV_CONFIG_PATH
        }
        : {})
});

const {
    createConnectorCredentialProvider
} = require(
    "../local-connector/ConnectorCredentialProviderFactory"
);

async function main() {
    const provider =
        createConnectorCredentialProvider();

    try {
        const credential =
            await provider.getCredential();

        process.exit(
            typeof credential === "string" &&
            credential.trim() !== ""
                ? 0
                : 1
        );
    } catch {
        process.exit(1);
    }
}

main();
