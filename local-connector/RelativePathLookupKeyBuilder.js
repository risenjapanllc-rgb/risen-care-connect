"use strict";

class RelativePathLookupKeyBuilder {
    build(relativePath) {
        if (typeof relativePath !== "string" || relativePath.length === 0) {
            throw new TypeError("relativePath must be a non-empty string");
        }

        return relativePath;
    }
}

module.exports = RelativePathLookupKeyBuilder;
