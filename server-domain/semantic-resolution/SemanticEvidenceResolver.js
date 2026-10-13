"use strict";

const SemanticEvidenceRuleCatalog =
    require(
        "./SemanticEvidenceRuleCatalog"
    );

function normalizeLabel(value) {
    return String(value ?? "")
        .trim()
        .normalize("NFKC")
        .toLowerCase();
}

function normalizeValues(values) {
    return (
        Array.isArray(values)
            ? values
            : []
    )
        .map(value =>
            String(
                value ?? ""
            ).trim()
        )
        .filter(Boolean);
}

function evidenceMatches(
    policy,
    sampleValues
) {
    const values =
        normalizeValues(
            sampleValues
        );

    if (!policy) {
        return false;
    }

    if (
        policy.type ===
        "has_samples"
    ) {
        return (
            values.length > 0
        );
    }

    if (
        policy.type ===
        "all_numeric"
    ) {
        return (
            values.length > 0 &&
            values.every(value =>
                /^-?\d+(?:\.\d+)?$/
                    .test(value)
            )
        );
    }

    if (
        policy.type ===
        "any_in_set"
    ) {
        const allowed =
            new Set(
                normalizeValues(
                    policy.values
                )
            );

        return values.some(
            value =>
                allowed.has(value)
        );
    }

    return false;
}

class SemanticEvidenceResolver {
    static resolve({
        fieldDefinitions = [],
        semanticEvidence = [],
        rules = null
    } = {}) {
        const activeRules =
            Array.isArray(rules)
                ? rules
                : SemanticEvidenceRuleCatalog
                    .list();

        const evidenceBySourceFieldKey =
            new Map(
                (
                    Array.isArray(
                        semanticEvidence
                    )
                        ? semanticEvidence
                        : []
                )
                    .filter(item =>
                        typeof item
                            ?.sourceFieldKey ===
                            "string" &&
                        item.sourceFieldKey
                            .trim()
                    )
                    .map(item => [
                        item.sourceFieldKey
                            .trim(),
                        item
                    ])
            );

        const results = [];

        for (
            const field
            of (
                Array.isArray(
                    fieldDefinitions
                )
                    ? fieldDefinitions
                    : []
            )
        ) {
            const sourceFieldKey =
                typeof field
                    ?.sourceFieldKey ===
                    "string"
                    ? field
                        .sourceFieldKey
                        .trim()
                    : "";

            if (!sourceFieldKey) {
                continue;
            }

            const normalizedLabel =
                normalizeLabel(
                    field?.headerLabel
                );

            const sourceEvidence =
                evidenceBySourceFieldKey
                    .get(
                        sourceFieldKey
                    );

            const sampleValues =
                normalizeValues(
                    sourceEvidence
                        ?.sampleValues
                );

            for (
                const rule
                of activeRules
            ) {
                const labels =
                    (
                        Array.isArray(
                            rule
                                ?.sourceLabels
                        )
                            ? rule
                                .sourceLabels
                            : []
                    )
                        .map(
                            normalizeLabel
                        );

                if (
                    !labels.includes(
                        normalizedLabel
                    )
                ) {
                    continue;
                }

                if (
                    !evidenceMatches(
                        rule
                            ?.evidencePolicy,
                        sampleValues
                    )
                ) {
                    continue;
                }

                const target =
                    rule
                        ?.semanticTarget;

                if (
                    !target
                        ?.entityName ||
                    !target
                        ?.fieldName
                ) {
                    continue;
                }

                results.push({
                    sourceFieldKey,

                    headerLabel:
                        field
                            ?.headerLabel ||
                        null,

                    candidate: {
                        entityName:
                            target
                                .entityName,
                        fieldName:
                            target
                                .fieldName,
                        displayName:
                            target
                                .displayName ||
                            null
                    },

                    status:
                        "contextual_candidate",

                    reason:
                        rule.reason ||
                        rule.id ||
                        "semantic_evidence_rule_match",

                    evidence: [{
                        type:
                            "source_sample_values",
                        values:
                            sampleValues
                                .slice(
                                    0,
                                    5
                                )
                    }],

                    humanConfirmationRequired:
                        true
                });

                break;
            }
        }

        return results;
    }
}

module.exports =
    SemanticEvidenceResolver;
