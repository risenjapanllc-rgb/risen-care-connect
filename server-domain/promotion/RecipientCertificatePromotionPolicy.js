"use strict";

const TARGET_DOMAIN_CONCEPT =
    "recipient_certificate";

const PROMOTION_CONTRACT_VERSION =
    "recipient-certificate-promotion-1";

class RecipientCertificatePromotionPolicy {
    static evaluate(input = {}) {
        const candidate =
            input?.candidate;

        const existingDomainState =
            input?.existingDomainState;

        if (
            candidate?.status !== "candidate" ||
            candidate?.targetDomainConcept !==
                TARGET_DOMAIN_CONCEPT ||
            candidate?.promotionContractVersion !==
                PROMOTION_CONTRACT_VERSION
        ) {
            return {
                status:
                    "rejected",
                targetDomainConcept:
                    TARGET_DOMAIN_CONCEPT
            };
        }

        if (
            candidate?.status === "candidate" &&
            candidate?.targetDomainConcept ===
                TARGET_DOMAIN_CONCEPT &&
            existingDomainState?.status ===
                "not_found"
        ) {
            return {
                status:
                    "ready_create",
                targetDomainConcept:
                    TARGET_DOMAIN_CONCEPT,
                candidate
            };
        }

        const domainFact =
            existingDomainState?.domainFact;

        if (
            candidate?.status === "candidate" &&
            candidate?.targetDomainConcept ===
                TARGET_DOMAIN_CONCEPT &&
            existingDomainState?.status ===
                "found" &&
            domainFact?.residentId ===
                candidate.residentId &&
            domainFact?.certificateNumber ===
                candidate.candidateFields?.certificateNumber &&
            domainFact?.validUntil ===
                candidate.candidateFields?.validUntil
        ) {
            return {
                status:
                    "unchanged",
                targetDomainConcept:
                    TARGET_DOMAIN_CONCEPT,
                candidate
            };
        }

        const candidateFields =
            candidate?.candidateFields;

        const existingValidUntilIsEmpty =
            domainFact?.validUntil === null ||
            domainFact?.validUntil === undefined ||
            (
                typeof domainFact?.validUntil ===
                    "string" &&
                domainFact.validUntil.trim() === ""
            );

        if (
            candidate?.status === "candidate" &&
            candidate?.targetDomainConcept ===
                TARGET_DOMAIN_CONCEPT &&
            existingDomainState?.status ===
                "found" &&
            domainFact?.residentId ===
                candidate.residentId &&
            domainFact?.certificateNumber ===
                candidateFields?.certificateNumber &&
            existingValidUntilIsEmpty &&
            typeof candidateFields?.validUntil ===
                "string" &&
            candidateFields.validUntil.trim() !== ""
        ) {
            return {
                status:
                    "ready_fill",
                targetDomainConcept:
                    TARGET_DOMAIN_CONCEPT,
                fieldsToFill: {
                    validUntil:
                        candidateFields.validUntil
                },
                candidate
            };
        }

        const certificateNumberDiffers =
            typeof domainFact?.certificateNumber ===
                "string" &&
            domainFact.certificateNumber.trim() !== "" &&
            typeof candidateFields?.certificateNumber ===
                "string" &&
            candidateFields.certificateNumber.trim() !== "" &&
            domainFact.certificateNumber !==
                candidateFields.certificateNumber;

        const validUntilDiffers =
            typeof domainFact?.validUntil ===
                "string" &&
            domainFact.validUntil.trim() !== "" &&
            typeof candidateFields?.validUntil ===
                "string" &&
            candidateFields.validUntil.trim() !== "" &&
            domainFact.validUntil !==
                candidateFields.validUntil;

        if (
            candidate?.status === "candidate" &&
            candidate?.targetDomainConcept ===
                TARGET_DOMAIN_CONCEPT &&
            existingDomainState?.status ===
                "found" &&
            domainFact?.residentId ===
                candidate.residentId &&
            (
                certificateNumberDiffers ||
                validUntilDiffers
            )
        ) {
            return {
                status:
                    "conflict",
                targetDomainConcept:
                    TARGET_DOMAIN_CONCEPT
            };
        }

        return {
            status:
                "rejected",
            targetDomainConcept:
                TARGET_DOMAIN_CONCEPT
        };
    }
}

module.exports =
    RecipientCertificatePromotionPolicy;
