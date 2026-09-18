"use strict";

class ResidentCreationService {
    constructor({
        connectorTrustService,
        residentCreationRepository
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !== "function"
        ) {
            throw new Error(
                "ResidentCreationService requires connectorTrustService"
            );
        }

        if (
            !residentCreationRepository ||
            typeof residentCreationRepository.create !== "function"
        ) {
            throw new Error(
                "ResidentCreationService requires residentCreationRepository"
            );
        }

        this.connectorTrustService =
            connectorTrustService;
        this.residentCreationRepository =
            residentCreationRepository;
    }

    async create({
        connectorId,
        credential,
        resident
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

        if (
            !trustResult ||
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        if (trustResult.status === "denied") {
            return {
                status: "denied",
                errorCode: "connector_trust_denied"
            };
        }

        if (trustResult.status !== "verified") {
            return {
                status: "error",
                errorCode:
                    trustResult.status === "error"
                        ? "connector_trust_unavailable"
                        : "connector_trust_invalid_result"
            };
        }

        const verifiedContext =
            trustResult.verifiedContext;

        if (
            !verifiedContext ||
            typeof verifiedContext !== "object" ||
            Array.isArray(verifiedContext) ||
            typeof verifiedContext.facilityId !== "string" ||
            !verifiedContext.facilityId.trim() ||
            typeof verifiedContext.connectorId !== "string" ||
            !verifiedContext.connectorId.trim()
        ) {
            return {
                status: "error",
                errorCode: "connector_trust_invalid_result"
            };
        }

        const name =
            typeof resident?.name === "string"
                ? resident.name.trim()
                : "";

        if (!name) {
            return {
                status: "invalid",
                errorCode: "resident_creation_invalid"
            };
        }

        try {
            return await this.residentCreationRepository.create({
                verifiedFacilityId:
                    verifiedContext.facilityId.trim(),
                verifiedConnectorId:
                    verifiedContext.connectorId.trim(),
                name
            });
        } catch (error) {
            if (
                error?.code ===
                    "resident_name_ambiguous"
            ) {
                return {
                    status: "ambiguous",
                    errorCode: "resident_name_ambiguous"
                };
            }

            return {
                status: "error",
                errorCode: "resident_creation_unavailable"
            };
        }
    }
}

module.exports = ResidentCreationService;
