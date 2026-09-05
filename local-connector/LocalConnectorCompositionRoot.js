"use strict";
const LocalConnectorService = require("./LocalConnectorService");
const SourceDocumentRegistry = require("./SourceDocumentRegistry");
const SourceDocumentKeyGenerator = require("./SourceDocumentKeyGenerator");
const RelativePathLookupKeyBuilder = require("./RelativePathLookupKeyBuilder");
const SqliteSourceDocumentRegistryStore = require("./SqliteSourceDocumentRegistryStore");
const DatabasePathResolver = require("./DatabasePathResolver");

function createService({ databasePath } = {}) {
    const resolvedDatabasePath =
        typeof databasePath === "string" && databasePath.trim() !== ""
            ? databasePath.trim()
            : new DatabasePathResolver().resolve();

    const registryStore = new SqliteSourceDocumentRegistryStore({
        databasePath: resolvedDatabasePath
    });
    const sourceDocumentRegistry = new SourceDocumentRegistry({
        sourceDocumentKeyGenerator: new SourceDocumentKeyGenerator(),
        registryStore,
        relativePathLookupKeyBuilder: new RelativePathLookupKeyBuilder()
    });

    return new LocalConnectorService({
        sourceDocumentRegistry
    });
}

module.exports = { createService };
