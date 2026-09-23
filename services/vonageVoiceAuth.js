"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getRequiredEnv(name) {
    const value =
        String(process.env[name] || "").trim();

    if (!value) {
        throw new Error(
            `${name} が設定されていません`
        );
    }

    return value;
}

function createVonageVoiceJwt() {
    const applicationId =
        getRequiredEnv(
            "VONAGE_APPLICATION_ID"
        );

    const privateKeyPath =
        getRequiredEnv(
            "VONAGE_PRIVATE_KEY_PATH"
        );

    const resolvedPath =
        path.resolve(
            process.cwd(),
            privateKeyPath
        );

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(
            `Vonage private.key が見つかりません: ${resolvedPath}`
        );
    }

    const privateKey =
        fs.readFileSync(
            resolvedPath,
            "utf8"
        );

    if (!privateKey.includes(
        "BEGIN PRIVATE KEY"
    )) {
        throw new Error(
            "Vonage private.key の形式を確認できません"
        );
    }

    const now =
        Math.floor(Date.now() / 1000);

    const payload = {
        application_id:
            applicationId,

        iat: now,

        exp:
            now + 300,

        jti:
            crypto.randomUUID()
    };

    return createJwt(
        payload,
        privateKey
    );
}

function createJwt(payload, privateKey) {
    const header = {
        alg: "RS256",
        typ: "JWT"
    };

    const encode =
        value =>
            Buffer.from(
                JSON.stringify(value)
            )
                .toString("base64url");

    const encodedHeader =
        encode(header);

    const encodedPayload =
        encode(payload);

    const signingInput =
        `${encodedHeader}.${encodedPayload}`;

    const signer =
        crypto.createSign("RSA-SHA256");

    signer.update(signingInput);
    signer.end();

    const signature =
        signer
            .sign(privateKey)
            .toString("base64url");

    return (
        `${signingInput}.${signature}`
    );
}

module.exports = {
    createVonageVoiceJwt
};
