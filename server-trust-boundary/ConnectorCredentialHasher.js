"use strict";

const {
    createHash
} = require("node:crypto");

class ConnectorCredentialHasher {
    hash(credential) {
        if (
            typeof credential !== "string" ||
            !credential
        ) {
            throw new Error(
                "connector credential is invalid"
            );
        }

        return createHash("sha256")
            .update(
                credential,
                "utf8"
            )
            .digest("hex");
    }
}

module.exports =
    ConnectorCredentialHasher;
