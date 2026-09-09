"use strict";

/**
 * Extracts connector credential material from Authorization transport.
 *
 * The concrete authorization scheme remains configuration,
 * not domain authority.
 */
class ConnectorCredentialTransport {
    constructor({
        authorizationScheme
    } = {}) {
        if (
            typeof authorizationScheme !== "string" ||
            !authorizationScheme.trim()
        ) {
            throw new Error(
                "ConnectorCredentialTransport requires authorizationScheme"
            );
        }

        this.authorizationScheme =
            authorizationScheme.trim();
    }

    extract(authorizationHeader) {
        if (
            typeof authorizationHeader !== "string" ||
            !authorizationHeader
        ) {
            return null;
        }

        const separatorIndex =
            authorizationHeader.indexOf(" ");

        if (separatorIndex <= 0) {
            return null;
        }

        const scheme =
            authorizationHeader
                .slice(0, separatorIndex)
                .trim();

        const credential =
            authorizationHeader
                .slice(separatorIndex + 1)
                .trim();

        if (
            scheme !== this.authorizationScheme ||
            !credential
        ) {
            return null;
        }

        return credential;
    }
}

module.exports =
    ConnectorCredentialTransport;
