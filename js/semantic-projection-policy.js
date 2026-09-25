"use strict";

(function () {
    const EXPLICIT_SEMANTIC_PROJECTION_TYPES =
        new Set([
            "recipient_certificate"
        ]);

    const LEGACY_DOCUMENT_TYPE_PROJECTIONS =
        new Set([
            "support_record",
            "recipient_certificate"
        ]);

    function resolveExplicitSemanticProjectionType(
        explicitSemanticType
    ) {
        if (
            typeof explicitSemanticType !== "string" ||
            explicitSemanticType.length === 0
        ) {
            return null;
        }

        return EXPLICIT_SEMANTIC_PROJECTION_TYPES.has(
            explicitSemanticType
        )
            ? explicitSemanticType
            : null;
    }

    function resolveSemanticProjectionType(
        confirmedDocumentType,
        explicitSemanticType
    ) {
        if (
            typeof explicitSemanticType === "string" &&
            explicitSemanticType.length > 0
        ) {
            return EXPLICIT_SEMANTIC_PROJECTION_TYPES.has(
                explicitSemanticType
            )
                ? explicitSemanticType
                : null;
        }

        if (
            typeof confirmedDocumentType !== "string"
        ) {
            return null;
        }

        return LEGACY_DOCUMENT_TYPE_PROJECTIONS.has(
            confirmedDocumentType
        )
            ? confirmedDocumentType
            : null;
    }

    const SEMANTIC_PROJECTION_REQUIREMENTS =
        Object.freeze({
            recipient_certificate:
                Object.freeze({
                    sourceRecordIdentityRequired:
                        false,
                    requiredMeanings:
                        Object.freeze([
                            Object.freeze({
                                entityName: "user",
                                fieldName: "name",
                                label: "利用者名"
                            }),
                            Object.freeze({
                                entityName:
                                    "recipient_certificate",
                                fieldName:
                                    "certificate_number",
                                label: "受給者証番号"
                            })
                        ])
                })
        });

    function getSemanticProjectionRequirementState(
        semanticType,
        mappings = []
    ) {
        const normalizedSemanticType =
            typeof semanticType === "string"
                ? semanticType.trim()
                : "";

        const requirement =
            SEMANTIC_PROJECTION_REQUIREMENTS[
                normalizedSemanticType
            ];

        if (!requirement) {
            return {
                status:
                    "semantic_projection_not_supported",
                semanticType:
                    normalizedSemanticType || null,
                missingRequiredMeanings: []
            };
        }

        const safeMappings =
            Array.isArray(mappings)
                ? mappings
                : [];

        const missingRequiredMeanings =
            requirement.requiredMeanings.filter(
                required =>
                    !safeMappings.some(
                        mapping =>
                            mapping.standardEntityName ===
                                required.entityName &&
                            mapping.standardFieldName ===
                                required.fieldName
                    )
            );

        return {
            status:
                missingRequiredMeanings.length > 0
                    ? "required_mapping_missing"
                    : "ready",
            semanticType:
                normalizedSemanticType,
            sourceRecordIdentityRequired:
                requirement.sourceRecordIdentityRequired,
            missingRequiredMeanings
        };
    }

    function resolveConfirmedExecutionSemanticType({
        confirmedDocumentType,
        explicitSemanticType,
        previewSemanticType
    } = {}) {
        const explicitProjection =
            resolveExplicitSemanticProjectionType(
                explicitSemanticType
            );

        if (explicitSemanticType != null) {
            if (
                !explicitProjection ||
                previewSemanticType !==
                    explicitProjection
            ) {
                return null;
            }

            return explicitProjection;
        }

        const legacyProjection =
            resolveSemanticProjectionType(
                confirmedDocumentType,
                null
            );

        if (!legacyProjection) {
            return null;
        }

        if (
            previewSemanticType != null &&
            previewSemanticType !==
                legacyProjection
        ) {
            return null;
        }

        return legacyProjection;
    }

    window.RisenSemanticProjectionPolicy = {
        resolveExplicitSemanticProjectionType,
        resolveSemanticProjectionType,
        getSemanticProjectionRequirementState,
        resolveConfirmedExecutionSemanticType
    };
})();
