"use strict";

function normalizeObservedLabel(value) {
    return String(value || "")
        .trim()
        .normalize("NFKC")
        .replace(/^\((.*)\)$/, "$1")
        .trim()
        .toLowerCase();
}

function resolveSubjectContext({
    fieldDefinitions = [],
    confirmedDocumentType = null,
    semanticEvidence = []
} = {}) {
    const labels = new Set(
        fieldDefinitions
            .map(field => normalizeObservedLabel(field?.headerLabel))
            .filter(Boolean)
    );

    const evidence = [];
    const hypotheses = {
        user: 0,
        staff: 0,
        recipient_certificate: 0
    };

    const observe = (label, subjects) => {
        const normalized = normalizeObservedLabel(label);
        if (!labels.has(normalized)) {
            return;
        }

        evidence.push({
            type: "observed_field",
            label,
            supports: [...subjects]
        });

        for (const subject of subjects) {
            hypotheses[subject] =
                (hypotheses[subject] || 0) + 1;
        }
    };

    observe("受給者証NO", ["recipient_certificate", "user"]);
    observe("受給者証番号", ["recipient_certificate", "user"]);
    observe("有効期限", ["recipient_certificate"]);
    observe("受給者証有効期限", ["recipient_certificate"]);
    observe("生年月日", ["user"]);
    observe("性別", ["user"]);
    observe("利用者名", ["user"]);
    observe("利用者氏名", ["user"]);
    observe("記録者", ["staff"]);
    observe("記入者", ["staff"]);
    observe("担当職員", ["staff"]);

    if (confirmedDocumentType === "recipient_certificate") {
        hypotheses.recipient_certificate += 2;
        evidence.push({
            type: "confirmed_document_type",
            value: "recipient_certificate",
            supports: ["recipient_certificate"]
        });
    }

    const rankedHypotheses = Object.entries(hypotheses)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([subject, score]) => ({ subject, score }));

    const contextualCandidates = [];

    const userEvidenceCount = evidence.filter(item =>
        Array.isArray(item.supports) &&
        item.supports.includes("user")
    ).length;

    const ambiguousNameField =
        fieldDefinitions.find(field =>
            normalizeObservedLabel(
                field?.headerLabel
            ) === "氏名"
        );

    const hasSeparateStaffField =
        fieldDefinitions.some(field =>
            [
                "記録者",
                "記入者",
                "担当職員",
                "職員名"
            ].includes(
                normalizeObservedLabel(
                    field?.headerLabel
                )
            )
        );

    const ambiguousNameEvidence =
        Array.isArray(semanticEvidence)
            ? semanticEvidence.find(item =>
                (
                    item?.sourceFieldKey &&
                    ambiguousNameField
                        ?.sourceFieldKey &&
                    item.sourceFieldKey ===
                        ambiguousNameField
                            .sourceFieldKey
                ) ||
                (
                    normalizeObservedLabel(
                        item?.headerLabel
                    ) === "氏名"
                )
            )
            : null;

    const ambiguousNameSampleValues =
        Array.isArray(
            ambiguousNameEvidence
                ?.sampleValues
        )
            ? ambiguousNameEvidence
                .sampleValues
                .map(value =>
                    String(value || "")
                        .trim()
                )
                .filter(Boolean)
            : [];

    if (
        confirmedDocumentType ===
            "recipient_certificate" &&
        ambiguousNameField
    ) {
        contextualCandidates.push({
            sourceFieldKey:
                ambiguousNameField.sourceFieldKey || null,
            headerLabel:
                ambiguousNameField.headerLabel || null,
            candidate: {
                entityName: "user",
                fieldName: "name",
                displayName: "利用者名"
            },
            status: "contextual_candidate",
            reason:
                "confirmed_recipient_certificate_context_supports_user_name",
            evidence: [{
                type: "confirmed_document_type",
                value: "recipient_certificate"
            }],
            humanConfirmationRequired: true
        });
    }

    if (
        ambiguousNameField &&
        confirmedDocumentType !==
            "recipient_certificate" &&
        hasSeparateStaffField &&
        ambiguousNameSampleValues.length > 0
    ) {
        contextualCandidates.push({
            sourceFieldKey:
                ambiguousNameField
                    .sourceFieldKey || null,
            headerLabel:
                ambiguousNameField
                    .headerLabel || null,

            candidate: {
                entityName: "user",
                fieldName: "name",
                displayName: "利用者名"
            },

            status:
                "contextual_candidate",

            reason:
                "separate_staff_field_and_source_values_support_user_name",

            evidence: [
                {
                    type:
                        "separate_staff_field"
                },
                {
                    type:
                        "source_sample_values",
                    values:
                        ambiguousNameSampleValues
                            .slice(0, 5)
                }
            ],

            humanConfirmationRequired:
                true
        });
    }

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

    const addContextualCandidate = ({
        field,
        entityName,
        fieldName,
        displayName,
        reason
    }) => {
        if (!field) {
            return;
        }

        const sourceFieldKey =
            typeof field
                ?.sourceFieldKey ===
                "string"
                ? field
                    .sourceFieldKey
                    .trim()
                : "";

        if (!sourceFieldKey) {
            return;
        }

        if (
            contextualCandidates.some(
                item =>
                    item.sourceFieldKey ===
                    sourceFieldKey
            )
        ) {
            return;
        }

        const sourceEvidence =
            evidenceBySourceFieldKey.get(
                sourceFieldKey
            );

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

        if (
            sampleValues.length === 0
        ) {
            return;
        }

        contextualCandidates.push({
            sourceFieldKey,
            headerLabel:
                field.headerLabel || null,

            candidate: {
                entityName,
                fieldName,
                displayName
            },

            status:
                "contextual_candidate",

            reason,

            evidence: [{
                type:
                    "source_sample_values",
                values:
                    sampleValues
                        .slice(0, 5)
            }],

            humanConfirmationRequired:
                true
        });
    };

    for (
        const field
        of fieldDefinitions
    ) {
        const label =
            normalizeObservedLabel(
                field?.headerLabel
            );

        if (label === "気温") {
            const sourceEvidence =
                evidenceBySourceFieldKey
                    .get(
                        field
                            ?.sourceFieldKey
                    );

            const values =
                Array.isArray(
                    sourceEvidence
                        ?.sampleValues
                )
                    ? sourceEvidence
                        .sampleValues
                    : [];

            const numericCount =
                values.filter(value =>
                    /^-?\d+(?:\.\d+)?$/
                        .test(
                            String(
                                value ?? ""
                            ).trim()
                        )
                ).length;

            if (
                values.length > 0 &&
                numericCount ===
                    values.length
            ) {
                addContextualCandidate({
                    field,
                    entityName:
                        "support_record",
                    fieldName:
                        "temperature",
                    displayName:
                        "記録時気温",
                    reason:
                        "temperature_label_and_numeric_source_values"
                });
            }
        }

        if (label === "天気") {
            const sourceEvidence =
                evidenceBySourceFieldKey
                    .get(
                        field
                            ?.sourceFieldKey
                    );

            const values =
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

            const weatherValues =
                new Set([
                    "晴",
                    "曇",
                    "雨",
                    "雪",
                    "晴れ",
                    "曇り"
                ]);

            if (
                values.some(value =>
                    weatherValues.has(
                        value
                    )
                )
            ) {
                addContextualCandidate({
                    field,
                    entityName:
                        "support_record",
                    fieldName:
                        "weather",
                    displayName:
                        "記録時天候",
                    reason:
                        "weather_label_and_weather_source_values"
                });
            }
        }

        if (label === "在園状態") {
            const sourceEvidence =
                evidenceBySourceFieldKey
                    .get(
                        field
                            ?.sourceFieldKey
                    );

            const values =
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

            const presenceValues =
                new Set([
                    "在中",
                    "不在"
                ]);

            if (
                values.some(value =>
                    presenceValues.has(
                        value
                    )
                )
            ) {
                addContextualCandidate({
                    field,
                    entityName:
                        "support_record",
                    fieldName:
                        "presence_status",
                    displayName:
                        "在園状態",
                    reason:
                        "presence_label_and_presence_source_values"
                });
            }
        }

        if (label === "行動") {
            const sourceEvidence =
                evidenceBySourceFieldKey
                    .get(
                        field
                            ?.sourceFieldKey
                    );

            const values =
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

            if (
                values.length > 0
            ) {
                addContextualCandidate({
                    field,
                    entityName:
                        "support_record",
                    fieldName:
                        "activity",
                    displayName:
                        "行動内容",
                    reason:
                        "activity_label_and_source_values"
                });
            }
        }
    }

    const userCodeField =
        fieldDefinitions.find(field =>
            [
                "社員番号",
                "利用者番号"
            ].includes(
                normalizeObservedLabel(
                    field?.headerLabel
                )
            )
        );

    if (
        userCodeField &&
        userEvidenceCount >= 2
    ) {
        contextualCandidates.push({
            sourceFieldKey:
                userCodeField.sourceFieldKey || null,
            headerLabel:
                userCodeField.headerLabel || null,
            candidate: {
                entityName: "user",
                fieldName: "user_code",
                displayName: "利用者番号"
            },
            status: "contextual_candidate",
            reason:
                "document_context_supports_user_but_label_is_ambiguous",
            evidence: evidence
                .filter(item =>
                    Array.isArray(item.supports) &&
                    item.supports.includes("user")
                )
                .map(item => ({
                    type: item.type,
                    label: item.label || null,
                    value: item.value || null
                })),
            humanConfirmationRequired: true
        });
    }

    const ambiguousFields = fieldDefinitions
        .filter(field => {
            const label = normalizeObservedLabel(
                field?.headerLabel
            );
            return [
                "社員番号",
                "氏名",
                "name",
                "id",
                "コード"
            ].includes(label);
        })
        .map(field => ({
            sourceFieldKey: field?.sourceFieldKey || null,
            headerLabel: field?.headerLabel || null,
            reason: "subject_not_determined_by_label_alone",
            humanConfirmationRequired: true
        }));

    return {
        status:
            rankedHypotheses.length > 0
                ? "hypotheses_available"
                : "insufficient_context",
        hypotheses: rankedHypotheses.map(item => ({
            ...item,
            status: "hypothesis",
            humanConfirmationRequired: true
        })),
        evidence,
        ambiguousFields,
        contextualCandidates,
        humanConfirmationRequired: true
    };
}

module.exports = {
    normalizeObservedLabel,
    resolveSubjectContext
};
