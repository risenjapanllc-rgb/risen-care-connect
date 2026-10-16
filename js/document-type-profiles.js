"use strict";

const DOCUMENT_TYPE_PROFILES = Object.freeze({
    support_record: Object.freeze({
        type: "support_record",
        label: "支援記録",
        step3Supported: true
    }),
    individual_support_plan: Object.freeze({
        type: "individual_support_plan",
        label: "個別支援計画",
        step3Supported: false
    }),
    assessment: Object.freeze({
        type: "assessment",
        label: "アセスメント",
        step3Supported: false
    }),
    monitoring: Object.freeze({
        type: "monitoring",
        label: "モニタリング",
        step3Supported: false
    }),
    recipient_certificate: Object.freeze({
        type: "recipient_certificate",
        label: "受給者証",
        step3Supported: true
    }),
    resident_master: Object.freeze({
        type: "resident_master",
        label: "利用者基本情報・利用者台帳",
        step3Supported: false
    }),
    other: Object.freeze({
        type: "other",
        label: "その他",
        step3Supported: false
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

window.RisenDocumentTypeProfiles = {
    getDocumentTypeProfile,
    listConfirmableDocumentTypes,
    resolveConfirmedDocumentType
};
