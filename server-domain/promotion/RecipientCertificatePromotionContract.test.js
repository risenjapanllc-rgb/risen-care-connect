"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificatePromotionContract =
    require("./RecipientCertificatePromotionContract");

function createSemanticRecord(overrides = {}) {
    return {
        recordId:
            "11111111-1111-4111-8111-111111111111",
        residentId:
            "22222222-2222-4222-8222-222222222222",
        semanticType:
            "recipient_certificate",
        semanticContent: {
            "user.name":
                "テスト利用者",
            "user.birth_date":
                "2000-01-01",
            "user.gender":
                "unknown",
            "user.user_code":
                "U-001",
            "recipient_certificate.certificate_number":
                "CERT-001",
            "recipient_certificate.valid_until":
                "2026-12-31"
        },
        contentHash:
            "a".repeat(64),
        canonicalizationVersion:
            "risen-recipient-certificate-canonicalization-2",
        sourceProvenance: {
            sourceDocumentKey:
                "sample.csv",
            sourceUpdatedAt:
                "2026-09-29T00:00:00.000Z",
            sourceSize:
                1234
        },
        ...overrides
    };
}

test(
    "recipient-certificate Promotion owns only certificate semantic fields and preserves semantic evidence",
    () => {
        const result =
            RecipientCertificatePromotionContract
                .buildCandidate(
                    createSemanticRecord()
                );

        assert.deepStrictEqual(
            result,
            {
                status:
                    "candidate",
                promotionContractVersion:
                    "recipient-certificate-promotion-1",
                targetDomainConcept:
                    "recipient_certificate",
                residentId:
                    "22222222-2222-4222-8222-222222222222",
                semanticEvidence: {
                    recordId:
                        "11111111-1111-4111-8111-111111111111",
                    contentHash:
                        "a".repeat(64),
                    canonicalizationVersion:
                        "risen-recipient-certificate-canonicalization-2",
                    sourceProvenance: {
                        sourceDocumentKey:
                            "sample.csv",
                        sourceUpdatedAt:
                            "2026-09-29T00:00:00.000Z",
                        sourceSize:
                            1234
                    }
                },
                candidateFields: {
                    certificateNumber:
                        "CERT-001",
                    validUntil:
                        "2026-12-31"
                }
            }
        );
    }
);

test(
    "user semantic fields do not become recipient-certificate Domain fields",
    () => {
        const result =
            RecipientCertificatePromotionContract
                .buildCandidate(
                    createSemanticRecord()
                );

        assert.deepStrictEqual(
            Object.keys(result.candidateFields),
            [
                "certificateNumber",
                "validUntil"
            ]
        );
    }
);

test(
    "non-recipient-certificate semantic records are not eligible for this Promotion contract",
    () => {
        const result =
            RecipientCertificatePromotionContract
                .buildCandidate(
                    createSemanticRecord({
                        semanticType:
                            "support_record"
                    })
                );

        assert.deepStrictEqual(
            result,
            {
                status:
                    "not_eligible",
                promotionContractVersion:
                    "recipient-certificate-promotion-1",
                targetDomainConcept:
                    "recipient_certificate"
            }
        );
    }
);

test(
    "Promotion candidate fails closed when stable semantic evidence is incomplete",
    () => {
        const record =
            createSemanticRecord({
                contentHash: null
            });

        const result =
            RecipientCertificatePromotionContract
                .buildCandidate(record);

        assert.deepStrictEqual(
            result,
            {
                status:
                    "insufficient_evidence",
                promotionContractVersion:
                    "recipient-certificate-promotion-1",
                targetDomainConcept:
                    "recipient_certificate"
            }
        );
    }
);

test(
    "recipient-certificate Promotion requires a governed certificate number before producing a candidate",
    () => {
        const record =
            createSemanticRecord({
                semanticContent: {
                    "user.name":
                        "テスト利用者",
                    "recipient_certificate.valid_until":
                        "2026-12-31"
                }
            });

        const result =
            RecipientCertificatePromotionContract
                .buildCandidate(record);

        assert.deepStrictEqual(
            result,
            {
                status:
                    "insufficient_evidence",
                promotionContractVersion:
                    "recipient-certificate-promotion-1",
                targetDomainConcept:
                    "recipient_certificate"
            }
        );
    }
);

test(
    "recipient-certificate Promotion fails closed for an unsupported semantic canonicalization version",
    () => {
        const result =
            RecipientCertificatePromotionContract.buildCandidate({
                recordId:
                    "11111111-1111-1111-1111-111111111111",
                residentId:
                    "22222222-2222-2222-2222-222222222222",
                semanticType:
                    "recipient_certificate",
                semanticContent: {
                    "recipient_certificate.certificate_number":
                        "CERT-001",
                    "recipient_certificate.valid_until":
                        "2026-12-31"
                },
                contentHash:
                    "a".repeat(64),
                canonicalizationVersion:
                    "risen-recipient-certificate-canonicalization-999",
                sourceProvenance: {
                    sourceDocumentKey:
                        "sample.csv",
                    sourceUpdatedAt:
                        "2026-09-29T00:00:00.000Z",
                    sourceSize:
                        1234
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "insufficient_evidence",
                promotionContractVersion:
                    "recipient-certificate-promotion-1",
                targetDomainConcept:
                    "recipient_certificate"
            }
        );
    }
);
