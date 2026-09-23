"use strict";

const DOCUMENT_TYPE_PROFILES = Object.freeze({
    support_record: Object.freeze({
        type: "support_record",
        label: "支援記録",
        step3Supported: true,
        sourceRecordIdentityRequired: true,
        requiredMeanings: Object.freeze([
            Object.freeze({
                entityName: "user",
                fieldName: "name",
                label: "利用者名"
            }),
            Object.freeze({
                entityName: "support_record",
                fieldName: "record_date",
                label: "記録日時"
            }),
            Object.freeze({
                entityName: "support_record",
                fieldName: "record_content",
                label: "支援記録本文"
            })
        ])
    }),
    individual_support_plan: Object.freeze({
        type: "individual_support_plan",
        label: "個別支援計画",
        step3Supported: false,
        requiredMeanings: Object.freeze([])
    }),
    assessment: Object.freeze({
        type: "assessment",
        label: "アセスメント",
        step3Supported: false,
        requiredMeanings: Object.freeze([])
    }),
    monitoring: Object.freeze({
        type: "monitoring",
        label: "モニタリング",
        step3Supported: false,
        requiredMeanings: Object.freeze([])
    }),
    recipient_certificate: Object.freeze({
        type: "recipient_certificate",
        label: "受給者証",
        step3Supported: true,
        sourceRecordIdentityRequired: false,
        requiredMeanings: Object.freeze([
            Object.freeze({
                entityName: "user",
                fieldName: "name",
                label: "利用者名"
            }),
            Object.freeze({
                entityName: "recipient_certificate",
                fieldName: "certificate_number",
                label: "受給者証番号"
            })
        ])
    }),
    resident_master: Object.freeze({
        type: "resident_master",
        label: "利用者基本情報・利用者台帳",
        step3Supported: false,
        requiredMeanings: Object.freeze([])
    }),
    other: Object.freeze({
        type: "other",
        label: "その他",
        step3Supported: false,
        requiredMeanings: Object.freeze([])
    })
});

function getDocumentTypeProfile(documentType) {
    const normalized = String(documentType || "").trim();
    return DOCUMENT_TYPE_PROFILES[normalized] || null;
}

function listConfirmableDocumentTypes() {
    return Object.values(DOCUMENT_TYPE_PROFILES).map(profile => ({
        type: profile.type,
        label: profile.label,
        step3Supported: profile.step3Supported
    }));
}

function resolveConfirmedDocumentType(
    detectedDocumentType,
    confirmedDocumentType
) {
    const confirmed =
        getDocumentTypeProfile(confirmedDocumentType);

    if (confirmed) {
        return {
            status: "confirmed",
            documentType: confirmed.type,
            profile: confirmed
        };
    }

    const detected =
        getDocumentTypeProfile(detectedDocumentType);

    return {
        status: "confirmation_required",
        documentType: null,
        detectedProfile: detected
    };
}

function getStep3RequirementState(documentType, mappings = []) {
    const profile = getDocumentTypeProfile(documentType);

    if (!profile) {
        return {
            status: "document_type_unresolved",
            profile: null,
            missingRequiredMeanings: []
        };
    }

    if (!profile.step3Supported) {
        return {
            status: "document_type_not_supported",
            profile,
            missingRequiredMeanings: []
        };
    }

    const safeMappings = Array.isArray(mappings) ? mappings : [];
    const missingRequiredMeanings = profile.requiredMeanings.filter(
        required => !safeMappings.some(mapping =>
            mapping.standardEntityName === required.entityName &&
            mapping.standardFieldName === required.fieldName
        )
    );

    return {
        status: missingRequiredMeanings.length
            ? "required_mapping_missing"
            : "ready",
        profile,
        missingRequiredMeanings
    };
}

window.RisenDocumentTypeProfiles = {
    getDocumentTypeProfile,
    listConfirmableDocumentTypes,
    resolveConfirmedDocumentType,
    getStep3RequirementState
};
