"use strict";

const os = require("node:os");
const path = require("node:path");

class DatabasePathResolver {
    resolve() {
        const configuredPath = process.env.RISEN_LOCAL_CONNECTOR_DATABASE_PATH;

        if (typeof configuredPath === "string" && configuredPath.trim() !== "") {
            return configuredPath.trim();
        }

        return path.join(
            os.homedir(),
            "Library",
            "Application Support",
            "RISEN CARE",
            "source-document-registry.sqlite"
        );
    }
}

module.exports = DatabasePathResolver;
