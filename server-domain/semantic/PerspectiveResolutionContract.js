"use strict";

const RESOLUTION_MODES =
    new Set([
        "resolved",
        "review"
    ]);

const PERSPECTIVE_TYPES =
    new Set([
        "facility_operation",
        "resident",
        "document",
        "medical_coordination",
        "mixed",
        "unknown"
    ]);

const SUBJECT_SCOPES =
    new Set([
        "single_resident",
        "multiple_residents",
        "facility",
        "mixed",
        "unknown"
    ]);

const TEMPORAL_SCOPES =
    new Set([
        "as_of_time",
        "event",
        "period",
        "future",
        "mixed",
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


class PerspectiveResolutionContract {
    static validate(
        resolution
    ) {
        if (
            !resolution ||
            typeof resolution !==
                "object" ||
            Array.isArray(
                resolution
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
                        resolution,
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
            !RESOLUTION_MODES.has(
                resolution
                    .resolutionMode
            ) ||
            !PERSPECTIVE_TYPES.has(
                resolution
                    .perspectiveType
            ) ||
            !SUBJECT_SCOPES.has(
                resolution
                    .subjectScope
            ) ||
            !TEMPORAL_SCOPES.has(
                resolution
                    .temporalScope
            ) ||
            !CONFIDENCE_LEVELS.has(
                resolution
                    .confidence
            )
        ) {
            return {
                status:
                    "invalid"
            };
        }

        if (
            typeof resolution
                .interpretation !==
                "string" ||
            typeof resolution
                .facilityQuestion !==
                "string"
        ) {
            return {
                status:
                    "invalid"
            };
        }

        if (
            resolution
                .resolutionMode ===
                "review" &&
            !resolution
                .facilityQuestion
                .trim()
        ) {
            return {
                status:
                    "invalid"
            };
        }

        return {
            status:
                "valid",

            perspectiveResolution:
                resolution
        };
    }
}


module.exports =
    PerspectiveResolutionContract;
