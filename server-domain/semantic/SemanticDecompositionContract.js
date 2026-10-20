"use strict";

const SourceEvidenceLocatorContract =
    require("./SourceEvidenceLocatorContract");

const DECOMPOSITION_MODES =
    new Set([
        "decomposed",
        "review"
    ]);

const SOURCE_SCOPES =
    new Set([
        "single_resident",
        "multiple_residents",
        "facility",
        "mixed",
        "unknown"
    ]);

const SUBJECT_TYPES =
    new Set([
        "resident",
        "facility",
        "staff",
        "document",
        "unknown"
    ]);

const TIME_MODES =
    new Set([
        "as_of_time",
        "event",
        "period",
        "future",
        "unknown"
    ]);

const CONFIDENCE_LEVELS =
    new Set([
        "high",
        "medium",
        "low"
    ]);

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


function isValidFact(
    fact
) {
    if (
        !isPlainObject(
            fact
        ) ||
        containsForbiddenFormalKey(
            fact
        )
    ) {
        return false;
    }

    if (
        !isPlainObject(
            fact.subject
        ) ||
        !SUBJECT_TYPES.has(
            fact.subject.type
        ) ||
        typeof fact.subject
            .reference !==
            "string" ||
        !fact.subject
            .reference
            .trim()
    ) {
        return false;
    }

    if (
        typeof fact
            .naturalMeaning !==
            "string" ||
        !fact
            .naturalMeaning
            .trim()
    ) {
        return false;
    }

    if (
        typeof fact.value !==
            "string" ||
        !fact.value.trim()
    ) {
        return false;
    }

    if (
        !isPlainObject(
            fact.time
        ) ||
        !TIME_MODES.has(
            fact.time.mode
        ) ||
        typeof fact.time
            .value !==
            "string"
    ) {
        return false;
    }

    if (
        !isPlainObject(
            fact.sourceEvidence
        ) ||
        typeof fact.sourceEvidence
            .sourceLabel !==
            "string" ||
        !fact.sourceEvidence
            .sourceLabel
            .trim() ||
        typeof fact.sourceEvidence
            .sourceValue !==
            "string"
    ) {
        return false;
    }

    if (
        !CONFIDENCE_LEVELS.has(
            fact.confidence
        )
    ) {
        return false;
    }

    if (
        fact.sourceEvidenceLocator !==
            undefined
    ) {
        const locatorResult =
            SourceEvidenceLocatorContract
                .validate(
                    fact
                        .sourceEvidenceLocator
                );

        if (
            locatorResult.status !==
                "valid"
        ) {
            return false;
        }
    }

    return true;
}


class SemanticDecompositionContract {
    static validate(
        decomposition
    ) {
        if (
            !isPlainObject(
                decomposition
            ) ||
            containsForbiddenFormalKey(
                decomposition
            )
        ) {
            return {
                status:
                    "invalid"
            };
        }

        if (
            !DECOMPOSITION_MODES.has(
                decomposition
                    .decompositionMode
            ) ||
            !SOURCE_SCOPES.has(
                decomposition
                    .sourceScope
            ) ||
            !Array.isArray(
                decomposition
                    .facts
            ) ||
            typeof decomposition
                .facilityQuestion !==
                "string"
        ) {
            return {
                status:
                    "invalid"
            };
        }

        if (
            decomposition
                .decompositionMode ===
                "decomposed"
        ) {
            if (
                decomposition
                    .facts
                    .length ===
                    0
            ) {
                return {
                    status:
                        "invalid"
                };
            }

            if (
                !decomposition
                    .facts
                    .every(
                        isValidFact
                    )
            ) {
                return {
                    status:
                        "invalid"
                };
            }
        }

        if (
            decomposition
                .decompositionMode ===
                "review" &&
            !decomposition
                .facilityQuestion
                .trim()
        ) {
            return {
                status:
                    "invalid"
            };
        }

        if (
            decomposition
                .decompositionMode ===
                "review" &&
            decomposition
                .facts
                .some(
                    (fact) =>
                        !isValidFact(
                            fact
                        )
                )
        ) {
            return {
                status:
                    "invalid"
            };
        }

        return {
            status:
                "valid",

            semanticDecomposition:
                decomposition
        };
    }
}


module.exports =
    SemanticDecompositionContract;
