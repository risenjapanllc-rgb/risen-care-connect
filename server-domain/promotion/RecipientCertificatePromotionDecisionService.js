"use strict";

class RecipientCertificatePromotionDecisionService {
    constructor({
        recipientCertificateDomainRepository,
        promotionPolicy
    } = {}) {
        if (
            !recipientCertificateDomainRepository ||
            typeof recipientCertificateDomainRepository
                .getCurrentByIdentity !== "function"
        ) {
            throw new Error(
                "RecipientCertificatePromotionDecisionService requires recipientCertificateDomainRepository"
            );
        }

        if (
            !promotionPolicy ||
            typeof promotionPolicy.evaluate !==
                "function"
        ) {
            throw new Error(
                "RecipientCertificatePromotionDecisionService requires promotionPolicy"
            );
        }

        this.recipientCertificateDomainRepository =
            recipientCertificateDomainRepository;

        this.promotionPolicy =
            promotionPolicy;
    }

    async decide(candidate = {}) {
        if (
            candidate?.status !== "candidate" ||
            candidate?.targetDomainConcept !== "recipient_certificate" ||
            candidate?.promotionContractVersion !==
                "recipient-certificate-promotion-1"
        ) {
            return {
                status: "rejected",
                targetDomainConcept: "recipient_certificate"
            };
        }

        const identity = {
            residentId:
                candidate?.residentId,
            certificateNumber:
                candidate?.candidateFields
                    ?.certificateNumber
        };

        let existingDomainState;

        try {
            existingDomainState =
                await this
                    .recipientCertificateDomainRepository
                    .getCurrentByIdentity(identity);
        } catch {
            return {
                status: "rejected",
                targetDomainConcept: "recipient_certificate"
            };
        }

        if (
            ![
                "found",
                "not_found"
            ].includes(existingDomainState?.status)
        ) {
            return {
                status: "rejected",
                targetDomainConcept: "recipient_certificate"
            };
        }

        if (
            existingDomainState?.status === "not_found" &&
            existingDomainState?.domainFact != null
        ) {
            return {
                status: "rejected",
                targetDomainConcept: "recipient_certificate"
            };
        }

        if (
            existingDomainState?.status === "found" &&
            existingDomainState?.domainFact == null
        ) {
            return {
                status: "rejected",
                targetDomainConcept: "recipient_certificate"
            };
        }

        if (
            existingDomainState?.status === "found" &&
            (
                existingDomainState.domainFact.residentId !==
                    identity.residentId ||
                existingDomainState.domainFact.certificateNumber !==
                    identity.certificateNumber
            )
        ) {
            return {
                status: "rejected",
                targetDomainConcept: "recipient_certificate"
            };
        }

        return this.promotionPolicy.evaluate({
            candidate,
            existingDomainState
        });
    }
}

module.exports =
    RecipientCertificatePromotionDecisionService;
