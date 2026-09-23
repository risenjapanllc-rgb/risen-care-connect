"use strict";

const ALLOWED_PROFILE_KEYS = new Set([
    "name",
    "birth_date",
    "gender",
    "user_code"
]);

function isRealIsoDate(value) {
    if (typeof value !== "string") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

class ConnectorResidentProfileService {
    constructor({
        connectorTrustService,
        repository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "ConnectorResidentProfileService requires connectorTrustService"
            );
        }

        if (!repository || typeof repository.fill !== "function") {
            throw new Error(
                "ConnectorResidentProfileService requires repository"
            );
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = repository;
    }

    async fill({
        connectorId,
        credential,
        sourceDocumentKey,
        identifierType,
        identifierDigest,
        name,
        residentProfile,
        sourceUpdatedAt,
        sourceSize
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService.authenticate({
                    connectorId,
                    credential
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

        if (!this.isValid({
            sourceDocumentKey,
            identifierType,
            identifierDigest,
            name,
            residentProfile,
            sourceUpdatedAt,
            sourceSize
        })) {
            return {
                status: "invalid",
                errorCode: "resident_profile_invalid"
            };
        }

        try {
            return await this.repository.fill({
                verifiedFacilityId: context.facilityId.trim(),
                verifiedConnectorId: context.connectorId.trim(),
                sourceDocumentKey: sourceDocumentKey.trim(),
                identifierType: identifierType.trim(),
                identifierDigest: identifierDigest.trim(),
                name: name.trim(),
                residentProfile: Object.fromEntries(
                    Object.entries(residentProfile).map(
                        ([key, value]) => [key, value.trim()]
                    )
                ),
                sourceUpdatedAt,
                sourceSize
            });
        } catch {
            return {
                status: "error",
                errorCode: "resident_profile_unavailable"
            };
        }
    }

    isValid(input) {
        if (
            typeof input.sourceDocumentKey !== "string" ||
            !input.sourceDocumentKey.trim() ||
            !["name", "user_code"].includes(input.identifierType) ||
            typeof input.identifierDigest !== "string" ||
            !/^[0-9a-f]{64}$/.test(input.identifierDigest) ||
            typeof input.name !== "string" ||
            !input.name.trim() ||
            !input.residentProfile ||
            typeof input.residentProfile !== "object" ||
            Array.isArray(input.residentProfile) ||
            Object.keys(input.residentProfile).some(
                key => !ALLOWED_PROFILE_KEYS.has(key)
            ) ||
            Object.values(input.residentProfile).some(
                value =>
                    typeof value !== "string" ||
                    !value.trim()
            ) ||
            typeof input.residentProfile.name !== "string" ||
            input.residentProfile.name.trim() !== input.name.trim() ||
            (
                input.residentProfile.birth_date !== undefined &&
                !isRealIsoDate(input.residentProfile.birth_date)
            ) ||
            typeof input.sourceUpdatedAt !== "string" ||
            Number.isNaN(Date.parse(input.sourceUpdatedAt)) ||
            !Number.isSafeInteger(input.sourceSize) ||
            input.sourceSize < 0
        ) {
            return false;
        }

        return true;
    }
}

module.exports = ConnectorResidentProfileService;
