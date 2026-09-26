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

module.exports = {
    evaluateRuntimeCapability
};
