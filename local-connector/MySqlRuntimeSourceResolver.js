"use strict";

const NamedCredentialStore =
    require(
        "./NamedCredentialStore"
    );

const {
    resolveDefaultHelperPath
} = require(
    "./ConnectorCredentialProviderFactory"
);

class MySqlRuntimeSourceResolver {
    constructor({
        localConfig,
        runtimeConfig,
        credentialStore
    } = {}) {
        this.localConfig =
            localConfig;

        this.runtimeConfig =
            runtimeConfig;

        this.credentialStore =
            credentialStore ||
            new NamedCredentialStore({
                helperPath:
                    resolveDefaultHelperPath(),
                key:
                    "mysql-password"
            });
    }

    async resolve() {
        const environmentSource =
            this.runtimeConfig
                .resolveMySqlSource();

        if (environmentSource) {
            return environmentSource;
        }

        const saved =
            await this.localConfig
                .getMySqlSource();

        if (!saved) {
            return null;
        }

        return {
            ...saved,
            password:
                await this.credentialStore
                    .read()
        };
    }
}

module.exports =
    MySqlRuntimeSourceResolver;
