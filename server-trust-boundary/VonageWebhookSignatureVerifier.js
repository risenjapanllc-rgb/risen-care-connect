"use strict";

const {
    verifySignature
} = require("@vonage/jwt");

class VonageWebhookSignatureVerifier {
    constructor({
        signatureSecret,
        signatureVerifier =
            verifySignature
    } = {}) {
        if (
            typeof signatureSecret !==
                "string" ||
            !signatureSecret.trim()
        ) {
            throw new Error(
                "VonageWebhookSignatureVerifier requires signatureSecret"
            );
        }

        if (
            typeof signatureVerifier !==
                "function"
        ) {
            throw new Error(
                "VonageWebhookSignatureVerifier requires signatureVerifier"
            );
        }

        this.signatureSecret =
            signatureSecret.trim();

        this.signatureVerifier =
            signatureVerifier;
    }

    verify(headers = {}) {
        if (
            !headers ||
            typeof headers !==
                "object"
        ) {
            return false;
        }

        const authorization =
            headers.authorization ||
            headers.Authorization;

        if (
            typeof authorization !==
                "string"
        ) {
            return false;
        }

        const match =
            authorization.match(
                /^Bearer\s+(.+)$/i
            );

        if (
            !match ||
            !match[1] ||
            !match[1].trim()
        ) {
            return false;
        }

        try {
            return (
                this.signatureVerifier(
                    match[1].trim(),
                    this.signatureSecret
                ) === true
            );
        } catch (error) {
            return false;
        }
    }
}

module.exports =
    VonageWebhookSignatureVerifier;
