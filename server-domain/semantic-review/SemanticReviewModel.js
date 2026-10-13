"use strict";

class SemanticReviewModel {
    static normalizeMeaning(value) {
        return typeof value === "string"
            ? value.trim()
            : "";
    }

    static findStandardField(
        semanticMeaning,
        standardFields = []
    ) {
        const meaning =
            this.normalizeMeaning(
                semanticMeaning
            );

        if (!meaning) {
            return null;
        }

        return (
            Array.isArray(standardFields)
                ? standardFields
                : []
        ).find(field => {
            const candidate =
                [
                    field?.entity_name,
                    field?.field_name
                ]
                    .filter(Boolean)
                    .join(".");

            return candidate === meaning;
        }) || null;
    }

    static getDisplayName({
        semanticMeaning,
        displayName = null,
        standardFields = []
    } = {}) {
        if (
            typeof displayName === "string" &&
            displayName.trim()
        ) {
            return displayName.trim();
        }

        const standard =
            this.findStandardField(
                semanticMeaning,
                standardFields
            );

        if (
            typeof standard?.display_name ===
                "string" &&
            standard.display_name.trim()
        ) {
            return standard
                .display_name
                .trim();
        }

        return this.normalizeMeaning(
            semanticMeaning
        );
    }

    static getEvidence(
        sourceFieldKey,
        analysis
    ) {
        const key =
            typeof sourceFieldKey === "string"
                ? sourceFieldKey.trim()
                : "";

        const evidence =
            Array.isArray(
                analysis
                    ?.extracted
                    ?.semanticEvidence
            )
                ? analysis
                    .extracted
                    .semanticEvidence
                : [];

        const sourceEvidence =
            evidence.find(item =>
                typeof item
                    ?.sourceFieldKey ===
                    "string" &&
                item.sourceFieldKey.trim() ===
                    key
            ) || null;

        const sampleValues =
            Array.isArray(
                sourceEvidence
                    ?.sampleValues
            )
                ? sourceEvidence
                    .sampleValues
                    .map(value =>
                        String(
                            value ?? ""
                        ).trim()
                    )
                    .filter(Boolean)
                : [];

        const neighboringFields =
            Array.isArray(
                sourceEvidence
                    ?.neighboringFields
            )
                ? sourceEvidence
                    .neighboringFields
                    .map(value =>
                        String(
                            value ?? ""
                        ).trim()
                    )
                    .filter(Boolean)
                : [];

        return {
            sampleValues,
            neighboringFields
        };
    }

    static toReviewItem({
        item,
        standardFields = [],
        analysis = null
    } = {}) {
        const sourceFieldKey =
            typeof item?.sourceFieldKey ===
                "string"
                ? item.sourceFieldKey.trim()
                : "";

        const semanticMeaning =
            this.normalizeMeaning(
                item?.semanticMeaning
            );

        let state = "unresolved";

        if (
            item?.status === "registered"
        ) {
            state = "registered";
        } else if (
            item?.status === "exact" ||
            item?.status === "alias"
        ) {
            state = "resolved";
        } else if (
            item?.status === "context"
        ) {
            state = "candidate";
        } else if (
            item?.status === "ambiguous"
        ) {
            state = "conflict";
        }

        const candidates =
            (
                Array.isArray(
                    item?.candidates
                )
                    ? item.candidates
                    : []
            )
                .map(candidate => {
                    const candidateMeaning =
                        this.normalizeMeaning(
                            candidate
                                ?.semanticMeaning
                        );

                    if (!candidateMeaning) {
                        return null;
                    }

                    return {
                        semanticMeaning:
                            candidateMeaning,

                        displayName:
                            this.getDisplayName({
                                semanticMeaning:
                                    candidateMeaning,
                                displayName:
                                    candidate
                                        ?.displayName,
                                standardFields
                            }),

                        matchType:
                            candidate
                                ?.matchType ||
                            null
                    };
                })
                .filter(Boolean);

        return {
            sourceFieldKey,

            sourceLabel:
                typeof item?.label ===
                    "string"
                    ? item.label.trim()
                    : "",

            state,

            semanticMeaning,

            displayName:
                this.getDisplayName({
                    semanticMeaning,
                    displayName:
                        item?.displayName,
                    standardFields
                }),

            candidates,

            evidence:
                this.getEvidence(
                    sourceFieldKey,
                    analysis
                )
        };
    }

    static summarize(items = []) {
        const list =
            Array.isArray(items)
                ? items
                : [];

        const result = {
            total: list.length,
            registered: 0,
            resolved: 0,
            candidate: 0,
            conflict: 0,
            unresolved: 0,
            review: 0
        };

        for (const item of list) {
            if (
                item?.status ===
                    "registered"
            ) {
                result.registered += 1;
                continue;
            }

            if (
                item?.status ===
                    "exact" ||
                item?.status ===
                    "alias"
            ) {
                result.resolved += 1;
                continue;
            }

            if (
                item?.status ===
                    "context"
            ) {
                result.candidate += 1;
                continue;
            }

            if (
                item?.status ===
                    "ambiguous"
            ) {
                result.conflict += 1;
                result.review += 1;
                continue;
            }

            result.unresolved += 1;
            result.review += 1;
        }

        return result;
    }
}

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports =
        SemanticReviewModel;
}

if (
    typeof window !== "undefined"
) {
    window.RisenSemanticReviewModel =
        SemanticReviewModel;
}
