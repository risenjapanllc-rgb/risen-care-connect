"use strict";

class ConnectorCredentialProvider {
    constructor({
        env = process.env,
        credentialStore
    } = {}) {
        if (
            !env ||
            typeof env !==
                "object"
        ) {
            throw new Error(
                "ConnectorCredentialProvider requires env"
            );
        }

        if (
            !credentialStore ||
            typeof credentialStore.read !==
                "function"
        ) {
            throw new Error(
                "ConnectorCredentialProvider requires credentialStore"
            );
        }

        this.env =
            env;

        this.credentialStore =
            credentialStore;
    }

    async getCredential() {
        try {
            const storedCredential =
                await this
                    .credentialStore
                    .read();

            if (
                typeof storedCredential ===
                    "string" &&
                storedCredential.trim()
            ) {
                return storedCredential.trim();
            }
        } catch {
            // Legacy environments may still use
            // CONNECTOR_CREDENTIAL.
        }

        const environmentCredential =
            this.env
                .CONNECTOR_CREDENTIAL;

        if (
            typeof environmentCredential ===
                "string" &&
            environmentCredential.trim()
        ) {
            return environmentCredential.trim();
        }

        throw new Error(
            "connector credential is unavailable"
        );
    }
}

module.exports =
    ConnectorCredentialProvider;
