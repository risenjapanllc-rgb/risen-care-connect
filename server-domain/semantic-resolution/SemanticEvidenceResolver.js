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

function normalizeLabels(values) {
    return normalizeValues(values)
        .map(normalizeLabel)
        .filter(Boolean);
}

function evidenceMatches(
    policy,
    sourceEvidence
) {
    const sampleValues =
        normalizeValues(
            sourceEvidence
                ?.sampleValues
        );

    const neighboringFields =
        normalizeLabels(
            sourceEvidence
                ?.neighboringFields
        );

    if (!policy) {
        return false;
    }

    if (
        policy.type ===
        "all_of"
    ) {
        const policies =
            Array.isArray(
                policy.policies
            )
                ? policy.policies
                : [];

        return (
            policies.length > 0 &&
            policies.every(
                childPolicy =>
                    evidenceMatches(
                        childPolicy,
                        sourceEvidence
                    )
            )
        );
    }

    if (
        policy.type ===
        "has_samples"
    ) {
        return (
            sampleValues.length > 0
        );
    }

    if (
        policy.type ===
        "minimum_sample_count"
    ) {
        const minimum =
            Number.isInteger(
                policy.minimum
            ) &&
            policy.minimum > 0
                ? policy.minimum
                : 1;

        return (
            sampleValues.length >=
            minimum
        );
    }

    if (
        policy.type ===
        "all_numeric"
    ) {
        return (
            sampleValues.length > 0 &&
            sampleValues.every(value =>
                /^-?\d+(?:\.\d+)?$/
                    .test(value)
            )
        );
    }

    if (
        policy.type ===
        "all_integer"
    ) {
        return (
            sampleValues.length > 0 &&
            sampleValues.every(value =>
                /^\d+$/
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

        return sampleValues.some(
            value =>
                allowed.has(value)
        );
    }

    if (
        policy.type ===
        "all_in_set"
    ) {
        const allowed =
            new Set(
                normalizeValues(
                    policy.values
                )
            );

        return (
            sampleValues.length > 0 &&
            sampleValues.every(
                value =>
                    allowed.has(value)
            )
        );
    }

    if (
        policy.type ===
        "neighboring_fields_include_at_least"
    ) {
        const expected =
            new Set(
                normalizeLabels(
                    policy.values
                )
            );

        const minimum =
            Number.isInteger(
                policy.minimum
            ) &&
            policy.minimum > 0
                ? policy.minimum
                : 1;

        const matches =
            new Set(
                neighboringFields.filter(
                    field =>
                        expected.has(
                            field
                        )
                )
            );

        return (
            matches.size >= minimum
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
                        sourceEvidence
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
                        rule
                            ?.resolutionPolicy ===
                            "automatic"
                            ? "automatic_candidate"
                            : "contextual_candidate",

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
                        rule
                            ?.resolutionPolicy ===
                            "automatic"
                            ? false
                            : true
                });

                break;
            }
        }

        return results;
    }
}

module.exports =
    SemanticEvidenceResolver;
