"use strict";

const SUPPORTED_CONTRACT_VERSION =
    "local-connector-runtime-v1";

const EXPECTED_SERVICE =
    "RISEN CARE Local Connector";

function unavailable() {
    return {
        status:
            "runtime_unavailable",
        supported: false
    };
}

const REQUIRED_CAPABILITIES_BY_OPERATION =
    Object.freeze({
        recipient_certificate:
            Object.freeze({
                semantic_contract:
                    "recipient_certificate.semantic_contract",
                preview:
                    "recipient_certificate.preview",
                fingerprint_execution:
                    "recipient_certificate.fingerprint_execution"
            })
    });

function getRequiredCapability(
    semanticType,
    operation
) {
    if (
        typeof semanticType !== "string" ||
        semanticType.trim() !== semanticType ||
        semanticType.length === 0 ||
        typeof operation !== "string" ||
        operation.trim() !== operation ||
        operation.length === 0
    ) {
        return null;
    }

    return (
        REQUIRED_CAPABILITIES_BY_OPERATION[
            semanticType
        ]?.[operation] ||
        null
    );
}

function evaluateRuntimeCapability(
    contract,
    requiredCapability
) {
    if (
        typeof requiredCapability !== "string" ||
        !requiredCapability ||
        requiredCapability.trim() !==
            requiredCapability
    ) {
        return unavailable();
    }

    if (
        !contract ||
        typeof contract !== "object" ||
        Array.isArray(contract) ||
        typeof contract.contractVersion !==
            "string" ||
        typeof contract.service !==
            "string" ||
        !Array.isArray(
            contract.capabilities
        )
    ) {
        return unavailable();
    }

    if (
        contract.contractVersion !==
            SUPPORTED_CONTRACT_VERSION ||
        contract.service !==
            EXPECTED_SERVICE
    ) {
        return {
            status:
                "runtime_incompatible",
            supported: false
        };
    }

    if (
        !contract.capabilities.every(
            capability =>
                typeof capability ===
                    "string" &&
                capability.length > 0 &&
                capability.trim() ===
                    capability
        )
    ) {
        return unavailable();
    }

    if (
        !contract.capabilities.includes(
            requiredCapability
        )
    ) {
        return {
            status:
                "capability_unsupported",
            supported: false
        };
    }

    return {
        status: "supported",
        supported: true
    };
}

const exported = {
    evaluateRuntimeCapability,
    getRequiredCapability
};

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports =
        exported;
}

if (
    typeof window !== "undefined"
) {
    window.LocalConnectorRuntimeCompatibilityPolicy =
        exported;
}
