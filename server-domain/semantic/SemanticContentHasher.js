"use strict";

const { createHash } = require("node:crypto");

class SemanticContentHasher {
    hash(canonicalString) {
        if (typeof canonicalString !== "string") {
            throw new TypeError("canonicalString must be a string");
        }

        return {
            contentHash: createHash("sha256")
                .update(canonicalString, "utf8")
                .digest("hex")
        };
    }
}

module.exports = SemanticContentHasher;