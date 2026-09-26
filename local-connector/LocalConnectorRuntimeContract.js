"use strict";

const CONTRACT_VERSION =
    "local-connector-runtime-v1";

const SERVICE =
    "RISEN CARE Local Connector";

const CAPABILITIES =
    Object.freeze([
        "recipient_certificate.semantic_contract",
        "recipient_certificate.preview",
        "recipient_certificate.fingerprint_execution"
    ]);

class LocalConnectorRuntimeContract {
    describe() {
        return {
            contractVersion:
                CONTRACT_VERSION,
            service:
                SERVICE,
            capabilities:
                [...CAPABILITIES]
        };
    }
}

module.exports =
    LocalConnectorRuntimeContract;
