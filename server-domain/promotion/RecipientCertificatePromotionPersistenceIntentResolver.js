"use strict";

class RecipientCertificatePromotionPersistenceIntentResolver {
    static resolve(decision = {}) {
        if (
            decision?.targetDomainConcept !==
                "recipient_certificate"
        ) {
            return {
                status:
                    "rejected",
                targetDomainConcept:
                    "recipient_certificate"
            };
        }

        if (decision.status === "conflict") {
            return {
                status:
                    "conflict",
                targetDomainConcept:
                    "recipient_certificate"
            };
        }

        if (
            decision?.candidate?.status !== "candidate" ||
            decision?.candidate?.targetDomainConcept !==
                "recipient_certificate" ||
            decision?.candidate?.promotionContractVersion !==
                "recipient-certificate-promotion-1"
        ) {
            return {
                status:
                    "rejected",
                targetDomainConcept:
                    "recipient_certificate"
            };
        }

        const identity = {
            residentId:
                decision.candidate.residentId,
            certificateNumber:
                decision.candidate.candidateFields
                    ?.certificateNumber
        };

        if (
            typeof identity.residentId !== "string" ||
            identity.residentId.trim() === "" ||
            typeof identity.certificateNumber !== "string" ||
            identity.certificateNumber.trim() === ""
        ) {
            return {
                status:
                    "rejected",
                targetDomainConcept:
                    "recipient_certificate"
            };
        }

        const semanticEvidence =
            decision.candidate.semanticEvidence;

        if (
            typeof semanticEvidence?.recordId !== "string" ||
            semanticEvidence.recordId.trim() === "" ||
            typeof semanticEvidence?.contentHash !== "string" ||
            !/^[0-9a-f]{64}$/.test(
                semanticEvidence.contentHash
            ) ||
            ![
                "risen-recipient-certificate-canonicalization-1",
                "risen-recipient-certificate-canonicalization-2"
            ].includes(
                semanticEvidence?.canonicalizationVersion
            )
        ) {
            return {
                status:
                    "rejected",
                targetDomainConcept:
                    "recipient_certificate"
            };
        }

        if (decision.status === "unchanged") {
            return {
                status:
                    "unchanged",
                targetDomainConcept:
                    "recipient_certificate"
            };
        }

        if (decision.status === "ready_create") {
            return {
                status:
                    "create_intent",
                targetDomainConcept:
                    "recipient_certificate",
                identity,
                domainFields: {
                    validUntil:
                        decision.candidate.candidateFields
                            ?.validUntil
                },
                promotionContractVersion:
                    decision.candidate.promotionContractVersion,
                semanticEvidence:
                    decision.candidate.semanticEvidence
            };
        }

        if (decision.status === "ready_fill") {
            const fieldsToFill =
                decision.fieldsToFill;

            if (
                !fieldsToFill ||
                typeof fieldsToFill !== "object" ||
                Array.isArray(fieldsToFill) ||
                Object.keys(fieldsToFill).some(
                    (field) => field !== "validUntil"
                )
            ) {
                return {
                    status:
                        "rejected",
                    targetDomainConcept:
                        "recipient_certificate"
                };
            }

            return {
                status:
                    "fill_intent",
                targetDomainConcept:
                    "recipient_certificate",
                identity,
                fieldsToFill: {
                    validUntil:
                        fieldsToFill.validUntil
                },
                promotionContractVersion:
                    decision.candidate.promotionContractVersion,
                semanticEvidence:
                    decision.candidate.semanticEvidence
            };
        }

        return {
            status:
                "rejected",
            targetDomainConcept:
                "recipient_certificate"
        };
    }
}

module.exports =
    RecipientCertificatePromotionPersistenceIntentResolver;
