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

        try {
            const keychainCredential =
                await this
                    .credentialStore
                    .read();

            if (
                typeof keychainCredential ===
                    "string" &&
                keychainCredential.trim()
            ) {
                return keychainCredential.trim();
            }
        } catch (error) {
            throw new Error(
                "connector credential is unavailable"
            );
        }

        throw new Error(
            "connector credential is unavailable"
        );
    }
}

module.exports =
    ConnectorCredentialProvider;
