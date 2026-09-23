"use strict";

class ConnectorResidentProfileQueryService {
    constructor({
        connectorTrustService,
        repository
    } = {}) {
        if (
            typeof connectorTrustService?.authenticate !== "function" ||
            typeof repository?.get !== "function"
        ) {
            throw new Error(
                "ConnectorResidentProfileQueryService requires trust service and repository"
            );
        }

        this.connectorTrustService = connectorTrustService;
        this.repository = repository;
    }

    async get(input = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService.authenticate({
                    connectorId: input.connectorId,
                    credential: input.credential
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

        if (
            typeof input.sourceDocumentKey !== "string" ||
            !input.sourceDocumentKey.trim() ||
            !["name", "user_code"].includes(input.identifierType) ||
            typeof input.identifierDigest !== "string" ||
            !/^[0-9a-f]{64}$/.test(input.identifierDigest) ||
            typeof input.sourceUpdatedAt !== "string" ||
            !input.sourceUpdatedAt.trim() ||
            Number.isNaN(Date.parse(input.sourceUpdatedAt)) ||
            !Number.isSafeInteger(input.sourceSize) ||
            input.sourceSize < 0
        ) {
            return {
                status: "invalid",
                errorCode: "resident_profile_query_invalid"
            };
        }

        try {
            const profile = await this.repository.get({
                verifiedFacilityId: context.facilityId.trim(),
                verifiedConnectorId: context.connectorId.trim(),
                sourceDocumentKey: input.sourceDocumentKey.trim(),
                identifierType: input.identifierType,
                identifierDigest: input.identifierDigest,
                sourceUpdatedAt: input.sourceUpdatedAt,
                sourceSize: input.sourceSize
            });

            if (profile === null) {
                return { status: "unavailable" };
            }

            return {
                status: "found",
                profile
            };
        } catch {
            return {
                status: "error",
                errorCode: "resident_profile_query_unavailable"
            };
        }
    }
}

module.exports = ConnectorResidentProfileQueryService;
