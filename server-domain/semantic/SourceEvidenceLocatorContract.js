"use strict";

const SOURCE_TYPES =
    new Set([
        "word",
        "excel",
        "csv",
        "voice"
    ]);

const FORBIDDEN_FORMAL_KEYS =
    [
        "semanticType",
        "entityName",
        "fieldName",
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


function isValidVoiceLocation(
    location
) {
    if (
        !isPlainObject(
            location
        )
    ) {
        return false;
    }

    const keys =
        Object.keys(
            location
        );

    if (
        keys.length !== 3 ||
        !keys.includes(
            "segmentIndex"
        ) ||
        !keys.includes(
            "startMs"
        ) ||
        !keys.includes(
            "endMs"
        )
    ) {
        return false;
    }

    return (
        Number.isInteger(
            location.segmentIndex
        ) &&
        location.segmentIndex >= 0 &&
        Number.isInteger(
            location.startMs
        ) &&
        location.startMs >= 0 &&
        Number.isInteger(
            location.endMs
        ) &&
        location.endMs >=
            location.startMs
    );
}


class SourceEvidenceLocatorContract {
    static validate(
        locator
    ) {
        if (
            !isPlainObject(
                locator
            )
        ) {
            return {
                status:
                    "invalid"
            };
        }

        for (
            const key
            of FORBIDDEN_FORMAL_KEYS
        ) {
            if (
                Object.prototype
                    .hasOwnProperty.call(
                        locator,
                        key
                    )
            ) {
                return {
                    status:
                        "invalid"
                };
            }
        }

        if (
            !SOURCE_TYPES.has(
                locator.sourceType
            ) ||
            typeof locator
                .documentReference !==
                "string" ||
            !locator
                .documentReference
                .trim() ||
            !isPlainObject(
                locator.location
            ) ||
            typeof locator
                .rawEvidence !==
                "string" ||
            !locator
                .rawEvidence
                .trim()
        ) {
            return {
                status:
                    "invalid"
            };
        }

        if (
            locator.sourceType ===
                "voice" &&
            !isValidVoiceLocation(
                locator.location
            )
        ) {
            return {
                status:
                    "invalid"
            };
        }

        if (
            locator
                .contextEvidence !==
                undefined &&
            typeof locator
                .contextEvidence !==
                "string"
        ) {
            return {
                status:
                    "invalid"
            };
        }

        return {
            status:
                "valid",

            sourceEvidenceLocator:
                locator
        };
    }
}


module.exports =
    SourceEvidenceLocatorContract;
