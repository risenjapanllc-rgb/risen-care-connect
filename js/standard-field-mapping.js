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

function findStandardFieldSuggestion(
    sourceName,
    standardFields = []
) {
    if (!Array.isArray(standardFields)) {
        return null;
    }

    const normalized =
        normalizeStandardFieldSourceName(sourceName);

    if (!normalized) {
        return null;
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
        return null;
    }

    const matches = standardFields.filter(field => {
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

    if (matches.length !== 1) {
        return null;
    }

    return matches[0];
}

window.RisenStandardFieldMapping = {
    normalizeStandardFieldSourceName,
    isAmbiguousIdentifierSourceName,
    findStandardFieldSuggestion
};
