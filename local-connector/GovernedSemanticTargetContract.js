"use strict";

class GovernedSemanticTargetContract {
    constructor({
        supportedSemanticTargets = []
    } = {}) {
        if (!Array.isArray(supportedSemanticTargets)) {
            throw new TypeError(
                "supportedSemanticTargets must be an array"
            );
        }

        this.supportedSemanticTargets =
            new Set(
                supportedSemanticTargets
                    .filter(
                        target =>
                            typeof target === "string" &&
                            target.trim()
                    )
                    .map(
                        target =>
                            target.trim()
                    )
            );
    }

    listSupportedSemanticTargets() {
        return Array.from(
            this.supportedSemanticTargets
        );
    }

    assertSupported(semanticKey) {
        if (
            typeof semanticKey !== "string" ||
            !this.supportedSemanticTargets
                .has(semanticKey)
        ) {
            const error = new Error(
                "Semantic target is not governed by authority"
            );

            error.code =
                "semantic_target_unsupported";

            throw error;
        }
    }
}

module.exports =
    GovernedSemanticTargetContract;
