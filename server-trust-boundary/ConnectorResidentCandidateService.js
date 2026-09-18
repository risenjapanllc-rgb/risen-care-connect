"use strict";

class ConnectorResidentCandidateService {
    constructor({
        connectorTrustService,
        residentCandidateRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "ConnectorResidentCandidateService requires connectorTrustService"
            );
        }

        if (
            !residentCandidateRepository ||
            typeof residentCandidateRepository.getCandidates !== "function"
        ) {
            throw new Error(
                "ConnectorResidentCandidateService requires residentCandidateRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.residentCandidateRepository =
            residentCandidateRepository;
    }

    async findCandidates({
        connectorId,
        credential,
        userCode,
        name
    } = {}) {
        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService.authenticate({
                    connectorId,
                    credential
                });
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            !trustResult ||
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (trustResult.status === "denied") {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        if (trustResult.status === "error") {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (trustResult.status !== "verified") {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const verifiedContext =
            trustResult.verifiedContext;

        if (
            !verifiedContext ||
            typeof verifiedContext !== "object" ||
            Array.isArray(verifiedContext) ||
            !String(
                verifiedContext.facilityId || ""
            ).trim() ||
            !String(
                verifiedContext.connectorId || ""
            ).trim()
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const normalizedUserCode =
            String(userCode || "").trim();

        const normalizedName =
            String(name || "").trim();

        if (
            (!normalizedUserCode && !normalizedName) ||
            (normalizedUserCode && normalizedName)
        ) {
            return {
                status: "invalid",
                errorCode:
                    "resident_identifier_required"
            };
        }

        let candidates;

        try {
            candidates =
                await this.residentCandidateRepository
                    .getCandidates({
                        verifiedFacilityId:
                            verifiedContext.facilityId,
                        verifiedConnectorId:
                            verifiedContext.connectorId,
                        userCode:
                            normalizedUserCode || null,
                        name:
                            normalizedName || null
                    });
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "resident_candidate_lookup_unavailable"
            };
        }

        if (!Array.isArray(candidates)) {
            return {
                status: "error",
                errorCode:
                    "resident_candidate_lookup_invalid_result"
            };
        }

        return {
            status: "ok",
            candidates
        };
    }
}

module.exports =
    ConnectorResidentCandidateService;
