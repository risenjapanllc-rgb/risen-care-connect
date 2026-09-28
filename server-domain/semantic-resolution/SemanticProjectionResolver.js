"use strict";

class SemanticProjectionResolver {
    static resolve({
        projectionPolicy,
        confirmedMappings = []
    } = {}) {
        if (
            !projectionPolicy ||
            typeof projectionPolicy
                .getSupportedExplicitSemanticProjectionTypes !==
                "function" ||
            typeof projectionPolicy
                .getSemanticProjectionRequirementState !==
                "function"
        ) {
            return {
                status: "unresolved",
                semanticProjectionTypes: []
            };
        }

        const supportedTypes =
            projectionPolicy
                .getSupportedExplicitSemanticProjectionTypes();

        if (!Array.isArray(supportedTypes)) {
            return {
                status: "unresolved",
                semanticProjectionTypes: []
            };
        }

        const mappings =
            Array.isArray(confirmedMappings)
                ? confirmedMappings
                : [];

        const semanticProjectionTypes =
            supportedTypes.filter(
                semanticType =>
                    typeof semanticType === "string" &&
                    semanticType.length > 0 &&
                    projectionPolicy
                        .getSemanticProjectionRequirementState(
                            semanticType,
                            mappings
                        )?.status === "ready"
            );

        return {
            status:
                semanticProjectionTypes.length > 0
                    ? "resolved"
                    : "unresolved",
            semanticProjectionTypes
        };
    }
}

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports = {
        SemanticProjectionResolver
    };
}

if (typeof window !== "undefined") {
    window.RisenSemanticProjectionResolver =
        SemanticProjectionResolver;
}
