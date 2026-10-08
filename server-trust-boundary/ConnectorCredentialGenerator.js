"use strict";

const {
    randomBytes
} = require("node:crypto");

class ConnectorCredentialGenerator {
    generate() {
        return randomBytes(32)
            .toString("base64url");
    }
}

module.exports =
    ConnectorCredentialGenerator;
