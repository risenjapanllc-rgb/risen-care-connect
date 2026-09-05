"use strict";

const { randomUUID } = require("node:crypto");

class SourceDocumentKeyGenerator {
    async generate() {
        return randomUUID();
    }
}

module.exports = SourceDocumentKeyGenerator;
