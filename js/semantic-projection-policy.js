"use strict";

(function () {
    let semanticProjectionContracts =
        new Map();

    let semanticProjectionContractAuthorityLoaded =
        false;

    function setSemanticProjectionContracts(
        contracts = [],
        standardFields = []
    ) {
        if (!Array.isArray(contracts)) {
            throw new Error(
                "Semantic Projection Contracts must be an array"
            );
        }

        const safeStandardFields =
            Array.isArray(standardFields)
                ? standardFields
                : [];

        const nextContracts =
            new Map();

        for (const contract of contracts) {
            const semanticType =
                typeof contract?.semanticType === "string"
                    ? contract.semanticType.trim()
                    : "";

            const sourceRecordIdentityRequired =
                contract?.sourceRecordIdentityRequired;

            const requiredSemanticTargets =
                contract?.requiredSemanticTargets;

            if (
                !semanticType ||
                typeof sourceRecordIdentityRequired !==
                    "boolean" ||
                !Array.isArray(
                    requiredSemanticTargets
                ) ||
                nextContracts.has(
                    semanticType
                )
            ) {
                throw new Error(
                    "Invalid Semantic Projection Contract"
                );
            }

            const requiredMeanings = [];

            for (
                const semanticTarget
                of requiredSemanticTargets
            ) {
                const normalizedTarget =
                    typeof semanticTarget === "string"
                        ? semanticTarget.trim()
                        : "";

                const separatorIndex =
                    normalizedTarget.indexOf(".");

                if (
                    !normalizedTarget ||
                    separatorIndex <= 0 ||
                    separatorIndex ===
                        normalizedTarget.length - 1
                ) {
                    throw new Error(
                        "Invalid required Semantic Target"
                    );
                }

                const entityName =
                    normalizedTarget.slice(
                        0,
                        separatorIndex
                    );

                const fieldName =
                    normalizedTarget.slice(
                        separatorIndex + 1
                    );

                const standardField =
                    safeStandardFields.find(
                        field =>
                            field?.entity_name ===
                                entityName &&
                            field?.field_name ===
                                fieldName
                    );

                const displayName =
                    typeof standardField?.display_name ===
                        "string" &&
                    standardField.display_name.trim()
                        ? standardField.display_name.trim()
                        : normalizedTarget;

                requiredMeanings.push(
                    Object.freeze({
                        entityName,
                        fieldName,
                        label:
                            displayName
                    })
                );
            }

            nextContracts.set(
                semanticType,
                Object.freeze({
                    sourceRecordIdentityRequired,
                    requiredMeanings:
                        Object.freeze(
                            requiredMeanings
                        )
                })
            );
        }

        semanticProjectionContracts =
            nextContracts;

        semanticProjectionContractAuthorityLoaded =
            true;
    }


    function resetSemanticProjectionContractAuthority() {
        semanticProjectionContracts =
            new Map();

        semanticProjectionContractAuthorityLoaded =
            false;
    }


    function isSemanticProjectionContractAuthorityLoaded() {
        return (
            semanticProjectionContractAuthorityLoaded ===
            true
        );
    }


    function getSupportedExplicitSemanticProjectionTypes() {
        return Array.from(
            semanticProjectionContracts.keys()
        );
    }

    function resolveExplicitSemanticProjectionType(
        explicitSemanticType
    ) {
        if (
            typeof explicitSemanticType !== "string" ||
            explicitSemanticType.length === 0
        ) {
            return null;
        }

        return semanticProjectionContracts.has(
            explicitSemanticType
        )
            ? explicitSemanticType
            : null;
    }

    function resolveSemanticProjectionType(
        confirmedDocumentType,
        explicitSemanticType
    ) {
        const normalizedExplicitSemanticType =
            typeof explicitSemanticType === "string"
                ? explicitSemanticType.trim()
                : "";

        if (normalizedExplicitSemanticType) {
            return semanticProjectionContracts.has(
                normalizedExplicitSemanticType
            )
                ? normalizedExplicitSemanticType
                : null;
        }

        const normalizedDocumentType =
            typeof confirmedDocumentType === "string"
                ? confirmedDocumentType.trim()
                : "";

        if (!normalizedDocumentType) {
            return null;
        }

        return semanticProjectionContracts.has(
            normalizedDocumentType
        )
            ? normalizedDocumentType
            : null;
    }

    function getSemanticProjectionRequirementState(
        semanticType,
        mappings = []
    ) {
        const normalizedSemanticType =
            typeof semanticType === "string"
                ? semanticType.trim()
                : "";

        const requirement =
            semanticProjectionContracts.get(
                normalizedSemanticType
            );

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
        resolvedSemanticProjectionType,
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

        if (
            confirmedDocumentType ===
                "resident_master" &&
            resolvedSemanticProjectionType != null
        ) {
            const resolvedProjection =
                resolveExplicitSemanticProjectionType(
                    resolvedSemanticProjectionType
                );

            if (
                !resolvedProjection ||
                previewSemanticType !==
                    resolvedProjection
            ) {
                return null;
            }

            return resolvedProjection;
        }

        const documentProjection =
            resolveSemanticProjectionType(
                confirmedDocumentType,
                null
            );

        if (!documentProjection) {
            return null;
        }

        if (
            previewSemanticType != null &&
            previewSemanticType !==
                documentProjection
        ) {
            return null;
        }

        return documentProjection;
    }

    window.RisenSemanticProjectionPolicy = {
        setSemanticProjectionContracts,
        resetSemanticProjectionContractAuthority,
        isSemanticProjectionContractAuthorityLoaded,
        getSupportedExplicitSemanticProjectionTypes,
        resolveExplicitSemanticProjectionType,
        resolveSemanticProjectionType,
        getSemanticProjectionRequirementState,
        resolveConfirmedExecutionSemanticType
    };
})();
