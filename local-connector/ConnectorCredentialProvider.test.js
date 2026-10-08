"use strict";

const assert =
    require("node:assert/strict");

const test =
    require("node:test");

const ConnectorCredentialProvider =
    require(
        "./ConnectorCredentialProvider"
    );

test(
    "uses environment credential when available",
    async () => {
        let keychainReadCount = 0;

        const provider =
            new ConnectorCredentialProvider({
                env: {
                    CONNECTOR_CREDENTIAL:
                        " env-secret "
                },

                credentialStore: {
                    async read() {
                        keychainReadCount += 1;
                        return "keychain-secret";
                    }
                }
            });

        const credential =
            await provider.getCredential();

        assert.equal(
            credential,
            "env-secret"
        );

        assert.equal(
            keychainReadCount,
            0
        );
    }
);

test(
    "falls back to keychain when environment credential is absent",
    async () => {
        const provider =
            new ConnectorCredentialProvider({
                env: {},

                credentialStore: {
                    async read() {
                        return "keychain-secret";
                    }
                }
            });

        const credential =
            await provider.getCredential();

        assert.equal(
            credential,
            "keychain-secret"
        );
    }
);

test(
    "reports credential unavailable when neither source has a credential",
    async () => {
        const provider =
            new ConnectorCredentialProvider({
                env: {},

                credentialStore: {
                    async read() {
                        throw new Error(
                            "credential is unavailable"
                        );
                    }
                }
            });

        await assert.rejects(
            () =>
                provider.getCredential(),
            /connector credential is unavailable/
        );
    }
);
