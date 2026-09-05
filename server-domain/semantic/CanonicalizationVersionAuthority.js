"use strict";

const CURRENT_VERSION = "risen-semantic-canonicalization-1";

class CanonicalizationVersionAuthority {
    getCurrentVersion() {
        return CURRENT_VERSION;
    }
}

module.exports = CanonicalizationVersionAuthority;