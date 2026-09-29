"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const RecipientCertificatePromotionPolicy =
    require("./RecipientCertificatePromotionPolicy");

const RecipientCertificatePromotionDecisionService =
    require("./RecipientCertificatePromotionDecisionService");

function createCandidate() {
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
        }
    };
}

test(
    "recipient-certificate Promotion resolves Domain state by resident and certificate number rather than source coordinates",
    async () => {
        let receivedIdentity = null;

        const repository = {
            async getCurrentByIdentity(identity) {
                receivedIdentity =
                    identity;

                return {
                    status:
                        "not_found"
                };
            }
        };

        const service =
            new RecipientCertificatePromotionDecisionService({
                recipientCertificateDomainRepository:
                    repository,
                promotionPolicy:
                    RecipientCertificatePromotionPolicy
            });

        const candidate =
            createCandidate();

        const result =
            await service.decide(candidate);

        assert.deepStrictEqual(
            receivedIdentity,
            {
                residentId:
                    candidate.residentId,
                certificateNumber:
                    candidate.candidateFields
                        .certificateNumber
            }
        );

        assert.strictEqual(
            result.status,
            "ready_create"
        );
    }
);

test(
    "recipient-certificate Promotion rejects an unsupported candidate before Domain repository lookup",
    async () => {
        let repositoryCalled =
            false;

        const repository = {
            async getCurrentByIdentity() {
                repositoryCalled =
                    true;

                return {
                    status:
                        "not_found"
                };
            }
        };

        const service =
            new RecipientCertificatePromotionDecisionService({
                recipientCertificateDomainRepository:
                    repository,
                promotionPolicy:
                    RecipientCertificatePromotionPolicy
            });

        const candidate = {
            ...createCandidate(),
            promotionContractVersion:
                "recipient-certificate-promotion-999"
        };

        const result =
            await service.decide(candidate);

        assert.strictEqual(
            repositoryCalled,
            false
        );

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
    "recipient-certificate Promotion rejects a malformed not_found Domain state that also contains a Domain fact",
    async () => {
        const repository = {
            async getCurrentByIdentity() {
                return {
                    status:
                        "not_found",
                    domainFact: {
                        residentId:
                            "22222222-2222-4222-8222-222222222222",
                        certificateNumber:
                            "CERT-001",
                        validUntil:
                            "2026-12-31"
                    }
                };
            }
        };

        const service =
            new RecipientCertificatePromotionDecisionService({
                recipientCertificateDomainRepository:
                    repository,
                promotionPolicy:
                    RecipientCertificatePromotionPolicy
            });

        const result =
            await service.decide(
                createCandidate()
            );

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
    "recipient-certificate Promotion rejects when Domain repository lookup fails",
    async () => {
        const repository = {
            async getCurrentByIdentity() {
                throw new Error(
                    "repository unavailable"
                );
            }
        };

        const service =
            new RecipientCertificatePromotionDecisionService({
                recipientCertificateDomainRepository:
                    repository,
                promotionPolicy:
                    RecipientCertificatePromotionPolicy
            });

        const result =
            await service.decide(
                createCandidate()
            );

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
    "recipient-certificate Promotion rejects a malformed found Domain state before Policy evaluation",
    async () => {
        let policyCalled =
            false;

        const repository = {
            async getCurrentByIdentity() {
                return {
                    status:
                        "found"
                };
            }
        };

        const promotionPolicy = {
            evaluate() {
                policyCalled =
                    true;

                return {
                    status:
                        "ready_create",
                    targetDomainConcept:
                        "recipient_certificate"
                };
            }
        };

        const service =
            new RecipientCertificatePromotionDecisionService({
                recipientCertificateDomainRepository:
                    repository,
                promotionPolicy
            });

        const result =
            await service.decide(
                createCandidate()
            );

        assert.strictEqual(
            policyCalled,
            false
        );

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
    "recipient-certificate Promotion rejects an unsupported Domain state status before Policy evaluation",
    async () => {
        let policyCalled =
            false;

        const repository = {
            async getCurrentByIdentity() {
                return {
                    status:
                        "unknown"
                };
            }
        };

        const promotionPolicy = {
            evaluate() {
                policyCalled =
                    true;

                return {
                    status:
                        "ready_create",
                    targetDomainConcept:
                        "recipient_certificate"
                };
            }
        };

        const service =
            new RecipientCertificatePromotionDecisionService({
                recipientCertificateDomainRepository:
                    repository,
                promotionPolicy
            });

        const result =
            await service.decide(
                createCandidate()
            );

        assert.strictEqual(
            policyCalled,
            false
        );

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
    "recipient-certificate Promotion rejects a found Domain fact whose identity does not match the lookup identity",
    async () => {
        let policyCalled =
            false;

        const repository = {
            async getCurrentByIdentity() {
                return {
                    status:
                        "found",
                    domainFact: {
                        residentId:
                            "22222222-2222-4222-8222-222222222222",
                        certificateNumber:
                            "CERT-999",
                        validUntil:
                            "2026-12-31"
                    }
                };
            }
        };

        const promotionPolicy = {
            evaluate() {
                policyCalled =
                    true;

                return {
                    status:
                        "conflict",
                    targetDomainConcept:
                        "recipient_certificate"
                };
            }
        };

        const service =
            new RecipientCertificatePromotionDecisionService({
                recipientCertificateDomainRepository:
                    repository,
                promotionPolicy
            });

        const result =
            await service.decide(
                createCandidate()
            );

        assert.strictEqual(
            policyCalled,
            false
        );

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
