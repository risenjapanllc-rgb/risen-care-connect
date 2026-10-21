"use strict";

/**
 * RISEN CARE標準項目への「候補」を探す共通ロジック。
 *
 * これは自動確定ではない。
 * standardFields に実在する項目だけを候補として返す。
 *
 * resident_id など識別子系は、この関数では自動提案しない。
 */

function normalizeStandardFieldSourceName(value) {
    return String(value || "")
        .trim()
        .normalize("NFKC")
        .replace(/^\((.*)\)$/, "$1")
        .trim()
        .toLowerCase()
        .replace(/[\s\-]+/g, "_");
}

function isAmbiguousIdentifierSourceName(value) {
    const normalized =
        normalizeStandardFieldSourceName(value);

    return (
        normalized === "id" ||
        normalized.endsWith("_id") ||
        normalized.includes("利用者番号") ||
        normalized.includes("利用者id") ||
        normalized.includes("利用者_id") ||
        normalized.includes("利用者コード")
    );
}

function findStandardFieldCandidates(
    sourceName,
    standardFields = []
) {
    if (!Array.isArray(standardFields)) {
        return [];
    }

    const normalized =
        normalizeStandardFieldSourceName(sourceName);

    if (!normalized) {
        return [];
    }

    const ambiguousSourceNames = new Set([
        "氏名",
        "name",
        "full_name",
        "社員番号",
        "社員コード",
        "職員番号",
        "職員コード",
        "担当者",
        "コード"
    ].map(normalizeStandardFieldSourceName));

    if (
        isAmbiguousIdentifierSourceName(sourceName) ||
        ambiguousSourceNames.has(normalized)
    ) {
        return [];
    }

    return standardFields.filter(field => {
        const candidates = [
            field?.field_name,
            field?.display_name,
            ...(Array.isArray(field?.synonyms)
                ? field.synonyms
                : [])
        ];

        return candidates.some(candidate =>
            normalizeStandardFieldSourceName(candidate) ===
            normalized
        );
    });
}


function findStandardFieldSuggestion(
    sourceName,
    standardFields = []
) {
    const matches =
        findStandardFieldCandidates(
            sourceName,
            standardFields
        );

    return matches.length === 1
        ? matches[0]
        : null;
}

function isSemanticTargetSupported(
    semanticTarget,
    supportedSemanticTargets
) {
    if (
        typeof semanticTarget !== "string" ||
        !Array.isArray(supportedSemanticTargets)
    ) {
        return false;
    }

    return supportedSemanticTargets.includes(
        semanticTarget
    );
}

function isSemanticTargetAllowedForDocumentType(
    documentType,
    semanticTarget,
    supportedSemanticTargets,
    semanticContractRequired = false
) {
    if (!Array.isArray(supportedSemanticTargets)) {
        return semanticContractRequired !== true;
    }

    return isSemanticTargetSupported(
        semanticTarget,
        supportedSemanticTargets
    );
}

function getSemanticConfirmationValidity(
    reviewState,
    documentType,
    semanticTarget,
    supportedSemanticTargets,
    semanticContractRequired = false
) {
    if (reviewState !== "confirmed") {
        return "not_confirmed";
    }

    if (
        semanticContractRequired === true &&
        !Array.isArray(
            supportedSemanticTargets
        )
    ) {
        return "contract_unconfirmed";
    }

    return isSemanticTargetAllowedForDocumentType(
        documentType,
        semanticTarget,
        supportedSemanticTargets,
        semanticContractRequired
    )
        ? "confirmed_current"
        : "confirmed_outside_current_contract";
}

function filterStandardFieldsBySemanticTargets(
    standardFields,
    supportedSemanticTargets
) {
    if (!Array.isArray(standardFields)) {
        return [];
    }

    return standardFields.filter(field => {
        const entityName =
            typeof field?.entity_name === "string"
                ? field.entity_name.trim()
                : "";

        const fieldName =
            typeof field?.field_name === "string"
                ? field.field_name.trim()
                : "";

        if (!entityName || !fieldName) {
            return false;
        }

        return isSemanticTargetSupported(
            `${entityName}.${fieldName}`,
            supportedSemanticTargets
        );
    });
}

window.RisenStandardFieldMapping = {
    normalizeStandardFieldSourceName,
    isAmbiguousIdentifierSourceName,
    findStandardFieldCandidates,
    findStandardFieldSuggestion,
    filterStandardFieldsBySemanticTargets,
    isSemanticTargetSupported,
    isSemanticTargetAllowedForDocumentType,
    getSemanticConfirmationValidity
};
