"use strict";

const PerspectiveResolutionContract =
    require("./PerspectiveResolutionContract");

const SemanticDecompositionContract =
    require("./SemanticDecompositionContract");


const FORBIDDEN_FORMAL_KEYS =
    [
        "entityName",
        "fieldName",
        "semanticType",
        "canonicalCode"
    ];


function isPlainObject(
    value
) {
    return (
        value !== null &&
        typeof value ===
            "object" &&
        !Array.isArray(
            value
        )
    );
}


function containsForbiddenFormalKey(
    value
) {
    if (
        !isPlainObject(
            value
        )
    ) {
        return false;
    }

    return FORBIDDEN_FORMAL_KEYS
        .some(
            (key) =>
                Object.prototype
                    .hasOwnProperty.call(
                        value,
                        key
                    )
        );
}


class SemanticAnalysisContract {
    static validate(
        analysis
    ) {
        if (
            !isPlainObject(
                analysis
            ) ||
            containsForbiddenFormalKey(
                analysis
            )
        ) {
            return {
                status:
                    "invalid"
            };
        }

        const perspectiveResult =
            PerspectiveResolutionContract
                .validate(
                    analysis
                        .perspectiveResolution
                );

        if (
            perspectiveResult.status !==
                "valid"
        ) {
            return {
                status:
                    "invalid"
            };
        }

        const decompositionResult =
            SemanticDecompositionContract
                .validate(
                    analysis
                        .semanticDecomposition
                );

        if (
            decompositionResult.status !==
                "valid"
        ) {
            return {
                status:
                    "invalid"
            };
        }

        return {
            status:
                "valid",

            semanticAnalysis:
                analysis
        };
    }
}


module.exports =
    SemanticAnalysisContract;
