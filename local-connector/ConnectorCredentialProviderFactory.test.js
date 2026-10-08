"use strict";

const assert =
    require("node:assert/strict");

const path =
    require("node:path");

const test =
    require("node:test");

const {
    createConnectorCredentialProvider
} =
    require(
        "./ConnectorCredentialProviderFactory"
    );

test(
    "creates provider using repository-relative macOS helper",
    async () => {
        const provider =
            createConnectorCredentialProvider({
                env: {
                    CONNECTOR_CREDENTIAL:
                        "env-secret"
                }
            });

        const credential =
            await provider.getCredential();

        assert.equal(
            credential,
            "env-secret"
        );

        assert.equal(
            provider
                .credentialStore
                .helperPath,
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
    "allows helper path override",
    () => {
        const provider =
            createConnectorCredentialProvider({
                env: {},
                helperPath:
                    "/tmp/custom-keychain-helper"
            });

        assert.equal(
            provider
                .credentialStore
                .helperPath,
            "/tmp/custom-keychain-helper"
        );
    }
);
