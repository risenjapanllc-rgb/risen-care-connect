"use strict";
const LocalConnectorService = require("./LocalConnectorService");
const SourceDocumentRegistry = require("./SourceDocumentRegistry");
const SourceDocumentKeyGenerator = require("./SourceDocumentKeyGenerator");
const RelativePathLookupKeyBuilder = require("./RelativePathLookupKeyBuilder");
const SqliteSourceDocumentRegistryStore = require("./SqliteSourceDocumentRegistryStore");

function createService({ databasePath } = {}) {
    const registryStore = new SqliteSourceDocumentRegistryStore({ databasePath });
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
