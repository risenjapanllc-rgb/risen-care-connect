"use strict";

const PROMOTION_CONTRACT_VERSION =
    "recipient-certificate-promotion-1";

const TARGET_DOMAIN_CONCEPT =
    "recipient_certificate";

const HASH_PATTERN =
    /^[a-f0-9]{64}$/;

const SUPPORTED_CANONICALIZATION_VERSIONS =
    new Set([
        "risen-recipient-certificate-canonicalization-1",
        "risen-recipient-certificate-canonicalization-2"
    ]);

class RecipientCertificatePromotionContract {
    static buildCandidate(record = {}) {
        if (
            !record ||
            typeof record !== "object" ||
            Array.isArray(record)
        ) {
            return this.#insufficientEvidence();
        }

        if (
            record.semanticType !==
                "recipient_certificate"
        ) {
            return this.#notEligible();
        }

        if (!this.#hasStableSemanticEvidence(record)) {
            return this.#insufficientEvidence();
        }

        const semanticContent =
            record.semanticContent;

        const certificateNumber =
            semanticContent[
                "recipient_certificate.certificate_number"
            ];

        if (
            typeof certificateNumber !== "string" ||
            !certificateNumber.trim()
        ) {
            return this.#insufficientEvidence();
        }

        return {
            status:
                "candidate",
            promotionContractVersion:
                PROMOTION_CONTRACT_VERSION,
            targetDomainConcept:
                TARGET_DOMAIN_CONCEPT,
            residentId:
                record.residentId,
            semanticEvidence: {
                recordId:
                    record.recordId,
                contentHash:
                    record.contentHash,
                canonicalizationVersion:
                    record.canonicalizationVersion,
                sourceProvenance: {
                    sourceDocumentKey:
                        record.sourceProvenance
                            .sourceDocumentKey,
                    sourceUpdatedAt:
                        record.sourceProvenance
                            .sourceUpdatedAt,
                    sourceSize:
                        record.sourceProvenance
                            .sourceSize
                }
            },
            candidateFields: {
                certificateNumber,
                validUntil:
                    semanticContent[
                        "recipient_certificate.valid_until"
                    ]
            }
        };
    }

    static #hasStableSemanticEvidence(record) {
        const provenance =
            record.sourceProvenance;

        return (
            typeof record.recordId === "string" &&
            record.recordId.length > 0 &&
            typeof record.residentId === "string" &&
            record.residentId.length > 0 &&
            record.semanticContent &&
            typeof record.semanticContent ===
                "object" &&
            !Array.isArray(record.semanticContent) &&
            HASH_PATTERN.test(
                record.contentHash || ""
            ) &&
            SUPPORTED_CANONICALIZATION_VERSIONS.has(
                record.canonicalizationVersion
            ) &&
            provenance &&
            typeof provenance === "object" &&
            !Array.isArray(provenance) &&
            typeof provenance.sourceDocumentKey ===
                "string" &&
            provenance.sourceDocumentKey.length > 0 &&
            typeof provenance.sourceUpdatedAt ===
                "string" &&
            provenance.sourceUpdatedAt.length > 0 &&
            Number.isSafeInteger(
                provenance.sourceSize
            ) &&
            provenance.sourceSize >= 0
        );
    }

    static #notEligible() {
        return {
            status:
                "not_eligible",
            promotionContractVersion:
                PROMOTION_CONTRACT_VERSION,
            targetDomainConcept:
                TARGET_DOMAIN_CONCEPT
        };
    }

    static #insufficientEvidence() {
        return {
            status:
                "insufficient_evidence",
            promotionContractVersion:
                PROMOTION_CONTRACT_VERSION,
            targetDomainConcept:
                TARGET_DOMAIN_CONCEPT
        };
    }
}

module.exports =
    RecipientCertificatePromotionContract;
