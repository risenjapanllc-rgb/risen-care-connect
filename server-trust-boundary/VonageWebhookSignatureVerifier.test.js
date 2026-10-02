"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VonageWebhookSignatureVerifier =
    require("./VonageWebhookSignatureVerifier");


test(
    "Authorizationがなければ拒否する",
    () => {
        const verifier =
            new VonageWebhookSignatureVerifier({
                signatureSecret:
                    "secret",

                signatureVerifier() {
                    throw new Error(
                        "呼ばれてはいけない"
                    );
                }
            });

        assert.equal(
            verifier.verify({}),
            false
        );
    }
);


test(
    "Bearer以外のAuthorizationを拒否する",
    () => {
        const verifier =
            new VonageWebhookSignatureVerifier({
                signatureSecret:
                    "secret",

                signatureVerifier() {
                    throw new Error(
                        "呼ばれてはいけない"
                    );
                }
            });

        assert.equal(
            verifier.verify({
                authorization:
                    "Basic abc"
            }),
            false
        );
    }
);


test(
    "Bearer JWTとSignature secretを検証器へ渡す",
    () => {
        let receivedToken =
            null;

        let receivedSecret =
            null;

        const verifier =
            new VonageWebhookSignatureVerifier({
                signatureSecret:
                    "signature-secret",

                signatureVerifier(
                    token,
                    secret
                ) {
                    receivedToken =
                        token;

                    receivedSecret =
                        secret;

                    return true;
                }
            });

        assert.equal(
            verifier.verify({
                authorization:
                    "Bearer signed-jwt"
            }),
            true
        );

        assert.equal(
            receivedToken,
            "signed-jwt"
        );

        assert.equal(
            receivedSecret,
            "signature-secret"
        );
    }
);


test(
    "署名検証失敗はfail closedで拒否する",
    () => {
        const verifier =
            new VonageWebhookSignatureVerifier({
                signatureSecret:
                    "secret",

                signatureVerifier() {
                    return false;
                }
            });

        assert.equal(
            verifier.verify({
                authorization:
                    "Bearer invalid-jwt"
            }),
            false
        );
    }
);


test(
    "署名検証器の例外もfail closedで拒否する",
    () => {
        const verifier =
            new VonageWebhookSignatureVerifier({
                signatureSecret:
                    "secret",

                signatureVerifier() {
                    throw new Error(
                        "verification failed"
                    );
                }
            });

        assert.equal(
            verifier.verify({
                Authorization:
                    "Bearer malformed-jwt"
            }),
            false
        );
    }
);
