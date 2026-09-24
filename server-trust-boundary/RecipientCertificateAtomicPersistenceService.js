"use strict";

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const WRITABLE_PROFILE_FIELDS = new Set([
    "name",
    "birth_date",
    "gender",
    "user_code"
]);
const SUPPORTED_VERSIONS = new Set([
    "risen-recipient-certificate-canonicalization-1",
    "risen-recipient-certificate-canonicalization-2"
]);

class RecipientCertificateAtomicPersistenceService {
    constructor({
        connectorTrustService,
        repository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new TypeError(
                "RecipientCertificateAtomicPersistenceService requires connectorTrustService"
            );
        }

        if (
            !repository ||
            typeof repository.persist !== "function"
        ) {
            throw new TypeError(
                "RecipientCertificateAtomicPersistenceService requires repository"
            );
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = repository;
    }

    async persist(contract = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService.authenticate({
                    connectorId: contract.connectorId,
                    credential: contract.credential
                });
        } catch {
            return {
                status: "error",
                errorCode: "connector_trust_unavailable"
            };
        }

        if (trustResult?.status === "denied") {
            return {
                status: "denied",
                errorCode: "connector_trust_denied"
            };
        }

        const context = trustResult?.verifiedContext;

        if (
            trustResult?.status !== "verified" ||
            typeof context?.facilityId !== "string" ||
            !context.facilityId.trim() ||
            typeof context?.connectorId !== "string" ||
            !context.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        try {
            this.#validate(contract);

            return await this.repository.persist({
                ...contract,
                verifiedFacilityId:
                    context.facilityId.trim(),
                verifiedConnectorId:
                    context.connectorId.trim()
            });
        } catch (error) {
            if (
                error &&
                error.errorCode ===
                    "recipient_certificate_atomic_persistence_invalid"
            ) {
                return {
                    status: "invalid",
                    errorCode: error.errorCode
                };
            }

            return {
                status: "unavailable",
                errorCode:
                    "recipient_certificate_atomic_persistence_unavailable"
            };
        }
    }

    #validate(contract) {
        if (!contract || typeof contract !== "object") {
            this.#invalid();
        }

        if (
            contract.resolution !== "existing" &&
            contract.resolution !== "planned_new"
        ) {
            this.#invalid();
        }

        if (
            contract.identifierType !== "name" &&
            contract.identifierType !== "user_code"
        ) {
            this.#invalid();
        }

        if (!HASH_PATTERN.test(contract.identifierDigest || "")) {
            this.#invalid();
        }

        if (
            contract.resolution === "existing" &&
            (
                typeof contract.residentId !== "string" ||
                contract.residentId.length === 0
            )
        ) {
            this.#invalid();
        }

        if (
            contract.resolution === "planned_new" &&
            contract.identifierType === "name" &&
            (
                typeof contract.displayName !== "string" ||
                contract.displayName.trim().length === 0
            )
        ) {
            this.#invalid();
        }

        if (
            typeof contract.sourceDocumentKey !== "string" ||
            contract.sourceDocumentKey.length === 0 ||
            typeof contract.sourceUpdatedAt !== "string" ||
            contract.sourceUpdatedAt.length === 0 ||
            !Number.isSafeInteger(contract.sourceSize) ||
            contract.sourceSize < 0
        ) {
            this.#invalid();
        }

        const profile = contract.residentProfile ?? {};

        if (
            !profile ||
            typeof profile !== "object" ||
            Array.isArray(profile)
        ) {
            this.#invalid();
        }

        for (const key of Object.keys(profile)) {
            if (!WRITABLE_PROFILE_FIELDS.has(key)) {
                this.#invalid();
            }
        }

        const semantic = contract.semantic;

        if (!semantic || typeof semantic !== "object") {
            this.#invalid();
        }

        if (
            semantic.semanticType !== "recipient_certificate" ||
            typeof semantic.logicalSlot !== "string" ||
            semantic.logicalSlot.length === 0 ||
            !semantic.semanticContent ||
            typeof semantic.semanticContent !== "object" ||
            Array.isArray(semantic.semanticContent) ||
            !HASH_PATTERN.test(semantic.contentHash || "") ||
            !SUPPORTED_VERSIONS.has(
                semantic.canonicalizationVersion
            ) ||
            (
                semantic.expectedContentHash !== null &&
                semantic.expectedContentHash !== undefined &&
                !HASH_PATTERN.test(
                    semantic.expectedContentHash
                )
            )
        ) {
            this.#invalid();
        }
    }

    #invalid() {
        const error = new TypeError(
            "Invalid recipient certificate atomic persistence contract"
        );
        error.errorCode =
            "recipient_certificate_atomic_persistence_invalid";
        throw error;
    }
}

module.exports =
    RecipientCertificateAtomicPersistenceService;
