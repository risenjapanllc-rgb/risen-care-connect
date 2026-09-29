"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificatePromotionPersistenceIntentResolver =
    require("./RecipientCertificatePromotionPersistenceIntentResolver");

function createReadyCreateDecision() {
    const semanticEvidence = {
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
    };

    return {
        status:
            "ready_create",
        targetDomainConcept:
            "recipient_certificate",
        candidate: {
            status:
                "candidate",
            promotionContractVersion:
                "recipient-certificate-promotion-1",
            targetDomainConcept:
                "recipient_certificate",
            residentId:
                "22222222-2222-4222-8222-222222222222",
            semanticEvidence,
            candidateFields: {
                certificateNumber:
                    "CERT-001",
                validUntil:
                    "2026-12-31"
            }
        }
    };
}

test(
    "recipient-certificate ready_create decision resolves to a create persistence intent with Domain identity and semantic evidence",
    () => {
        const decision =
            createReadyCreateDecision();

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

        assert.deepStrictEqual(
            result,
            {
                status:
                    "create_intent",
                targetDomainConcept:
                    "recipient_certificate",
                identity: {
                    residentId:
                        "22222222-2222-4222-8222-222222222222",
                    certificateNumber:
                        "CERT-001"
                },
                domainFields: {
                    validUntil:
                        "2026-12-31"
                },
                promotionContractVersion:
                    "recipient-certificate-promotion-1",
                semanticEvidence:
                    decision.candidate.semanticEvidence
            }
        );
    }
);

test(
    "recipient-certificate ready_fill decision resolves to a fill persistence intent without overwriting identity",
    () => {
        const decision =
            createReadyCreateDecision();

        decision.status =
            "ready_fill";

        decision.fieldsToFill = {
            validUntil:
                "2026-12-31"
        };

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

        assert.deepStrictEqual(
            result,
            {
                status:
                    "fill_intent",
                targetDomainConcept:
                    "recipient_certificate",
                identity: {
                    residentId:
                        "22222222-2222-4222-8222-222222222222",
                    certificateNumber:
                        "CERT-001"
                },
                fieldsToFill: {
                    validUntil:
                        "2026-12-31"
                },
                promotionContractVersion:
                    "recipient-certificate-promotion-1",
                semanticEvidence:
                    decision.candidate.semanticEvidence
            }
        );
    }
);

test(
    "recipient-certificate persistence intent rejects a ready_create decision with incomplete Domain identity",
    () => {
        const decision =
            createReadyCreateDecision();

        delete decision.candidate
            .candidateFields
            .certificateNumber;

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

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

test(
    "recipient-certificate persistence intent rejects a decision with incomplete semantic evidence",
    () => {
        const decision =
            createReadyCreateDecision();

        delete decision.candidate
            .semanticEvidence
            .contentHash;

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

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

test(
    "recipient-certificate persistence intent rejects semantic evidence without a record id",
    () => {
        const decision =
            createReadyCreateDecision();

        delete decision.candidate
            .semanticEvidence
            .recordId;

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

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

test(
    "recipient-certificate persistence intent rejects unsupported semantic canonicalization version",
    () => {
        const decision =
            createReadyCreateDecision();

        decision.candidate
            .semanticEvidence
            .canonicalizationVersion =
                "risen-recipient-certificate-canonicalization-999";

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

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

test(
    "recipient-certificate unchanged decision produces no persistence write intent",
    () => {
        const decision =
            createReadyCreateDecision();

        decision.status =
            "unchanged";

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

        assert.deepStrictEqual(
            result,
            {
                status:
                    "unchanged",
                targetDomainConcept:
                    "recipient_certificate"
            }
        );
    }
);

test(
    "recipient-certificate conflict decision produces no persistence write intent and preserves conflict",
    () => {
        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve({
                    status:
                        "conflict",
                    targetDomainConcept:
                        "recipient_certificate"
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
    "recipient-certificate fill persistence intent rejects fields outside the governed fill allowlist",
    () => {
        const decision =
            createReadyCreateDecision();

        decision.status =
            "ready_fill";

        decision.fieldsToFill = {
            validUntil:
                "2026-12-31",
            certificateNumber:
                "CERT-999"
        };

        const result =
            RecipientCertificatePromotionPersistenceIntentResolver
                .resolve(decision);

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
