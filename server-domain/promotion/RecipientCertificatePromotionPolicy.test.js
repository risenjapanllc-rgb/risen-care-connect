"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificatePromotionPolicy =
    require("./RecipientCertificatePromotionPolicy");

function createCandidate(overrides = {}) {
    return {
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
        },
        ...overrides
    };
}

test(
    "recipient-certificate Promotion is ready to create only when no current Domain fact exists",
    () => {
        const result =
            RecipientCertificatePromotionPolicy.evaluate({
                candidate:
                    createCandidate(),
                existingDomainState: {
                    status:
                        "not_found"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "ready_create",
                targetDomainConcept:
                    "recipient_certificate",
                candidate:
                    createCandidate()
            }
        );
    }
);

test(
    "recipient-certificate Promotion is unchanged when the current Domain fact already matches the candidate",
    () => {
        const candidate =
            createCandidate();

        const result =
            RecipientCertificatePromotionPolicy.evaluate({
                candidate,
                existingDomainState: {
                    status:
                        "found",
                    domainFact: {
                        residentId:
                            candidate.residentId,
                        certificateNumber:
                            "CERT-001",
                        validUntil:
                            "2026-12-31"
                    }
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "unchanged",
                targetDomainConcept:
                    "recipient_certificate",
                candidate
            }
        );
    }
);

test(
    "recipient-certificate Promotion conflicts instead of overwriting a differing current Domain fact",
    () => {
        const candidate =
            createCandidate();

        const result =
            RecipientCertificatePromotionPolicy.evaluate({
                candidate,
                existingDomainState: {
                    status:
                        "found",
                    domainFact: {
                        residentId:
                            candidate.residentId,
                        certificateNumber:
                            "CERT-001",
                        validUntil:
                            "2027-03-31"
                    }
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "conflict",
                targetDomainConcept:
                    "recipient_certificate"
            }
        );
    }
);

test(
    "recipient-certificate Promotion can fill an empty non-identity Domain field without overwriting existing values",
    () => {
        const candidate =
            createCandidate();

        const result =
            RecipientCertificatePromotionPolicy.evaluate({
                candidate,
                existingDomainState: {
                    status:
                        "found",
                    domainFact: {
                        residentId:
                            candidate.residentId,
                        certificateNumber:
                            "CERT-001",
                        validUntil:
                            null
                    }
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "ready_fill",
                targetDomainConcept:
                    "recipient_certificate",
                fieldsToFill: {
                    validUntil:
                        "2026-12-31"
                },
                candidate
            }
        );
    }
);

test(
    "recipient-certificate Promotion Policy fails closed for an unsupported Promotion contract version",
    () => {
        const result =
            RecipientCertificatePromotionPolicy.evaluate({
                candidate:
                    createCandidate({
                        promotionContractVersion:
                            "recipient-certificate-promotion-999"
                    }),
                existingDomainState: {
                    status:
                        "not_found"
                }
            });

        assert.deepStrictEqual(
            result,
            {
                status:
                    "rejected",
                targetDomainConcept:
                    "recipient_certificate"
            }
        );
    }
);
