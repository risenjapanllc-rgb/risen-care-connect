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
    confirmedDocumentType = null
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

    const employeeNumberField =
        fieldDefinitions.find(field =>
            normalizeObservedLabel(
                field?.headerLabel
            ) === "社員番号"
        );

    if (
        employeeNumberField &&
        userEvidenceCount >= 2
    ) {
        contextualCandidates.push({
            sourceFieldKey:
                employeeNumberField.sourceFieldKey || null,
            headerLabel:
                employeeNumberField.headerLabel || null,
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
