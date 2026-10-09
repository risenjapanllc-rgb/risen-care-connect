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
    "uses stored credential before environment credential",
    async () => {
        let keychainReadCount = 0;

        const provider =
            new ConnectorCredentialProvider({
                env: {
                    CONNECTOR_CREDENTIAL:
                        "env-secret"
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
            "keychain-secret"
        );

        assert.equal(
            keychainReadCount,
            1
        );
    }
);

test(
    "falls back to environment credential when stored credential is unavailable",
    async () => {
        const provider =
            new ConnectorCredentialProvider({
                env: {
                    CONNECTOR_CREDENTIAL:
                        " env-secret "
                },

                credentialStore: {
                    async read() {
                        throw new Error(
                            "credential unavailable"
                        );
                    }
                }
            });

        const credential =
            await provider.getCredential();

        assert.equal(
            credential,
            "env-secret"
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
                            "credential unavailable"
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
