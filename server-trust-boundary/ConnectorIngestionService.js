"use strict";

/**
 * Connector ingestion orchestration at the Server Trust Boundary.
 *
 * Trust verification must succeed before payload validation, and payload
 * validation must succeed before resident matching.
 */
class ConnectorIngestionService {
    constructor({
        connectorTrustService,
        connectorPayloadValidator,
        serverTrustBoundaryService
    } = {}) {
        if (!connectorTrustService) {
            throw new Error("ConnectorIngestionService requires connectorTrustService");
        }
        if (!connectorPayloadValidator) {
            throw new Error("ConnectorIngestionService requires connectorPayloadValidator");
        }
        if (!serverTrustBoundaryService) {
            throw new Error("ConnectorIngestionService requires serverTrustBoundaryService");
        }

        this.connectorTrustService = connectorTrustService;
        this.connectorPayloadValidator = connectorPayloadValidator;
        this.serverTrustBoundaryService = serverTrustBoundaryService;
    }

    async ingest({ connectorId, credential, payload } = {}) {
        const detailedResult =
            await this.ingestForSemanticProcessing({
                connectorId,
                credential,
                payload
            });

        if (
            detailedResult &&
            typeof detailedResult === "object" &&
            !Array.isArray(detailedResult) &&
            detailedResult.status === "ready"
        ) {
            return detailedResult.residentMatching;
        }

        return detailedResult;
    }

    async ingestForSemanticProcessing({
        connectorId,
        credential,
        payload
    } = {}) {
        let trustResult;
        try {
            trustResult = await this.connectorTrustService.authenticate({
                connectorId,
                credential
            });
        } catch (err) {
            return this.trustError("connector_trust_unavailable");
        }

        if (!trustResult || typeof trustResult !== "object" || Array.isArray(trustResult)) {
            return this.trustError("connector_trust_invalid_result");
        }

        if (trustResult.status === "denied") {
            return this.trustError("connector_trust_denied", "denied");
        }

        if (trustResult.status === "error") {
            return this.trustError("connector_trust_unavailable");
        }

        if (trustResult.status !== "verified") {
            return this.trustError("connector_trust_invalid_result");
        }

        const verifiedContext = trustResult.verifiedContext;
        if (!this.isValidVerifiedContext(verifiedContext)) {
            return this.trustError("connector_trust_invalid_result");
        }

        let payloadResult;
        try {
            payloadResult = this.connectorPayloadValidator.validate(payload);
        } catch (err) {
            return {
                status: "error",
                errorCode: "connector_payload_validation_unavailable"
            };
        }

        if (!payloadResult || typeof payloadResult !== "object" || Array.isArray(payloadResult)) {
            return {
                status: "error",
                errorCode: "connector_payload_invalid_result"
            };
        }

        if (payloadResult.status !== "valid") {
            if (payloadResult.status === "invalid") {
                return {
                    status: "invalid",
                    errorCode: payloadResult.errorCode || "connector_payload_invalid"
                };
            }

            return {
                status: "error",
                errorCode: "connector_payload_invalid_result"
            };
        }

        const validatedPayload = payloadResult.validatedPayload;
        const sourceResident = validatedPayload?.sourceResident;
        if (
            !validatedPayload ||
            typeof validatedPayload !== "object" ||
            Array.isArray(validatedPayload) ||
            !sourceResident ||
            typeof sourceResident !== "object" ||
            Array.isArray(sourceResident)
        ) {
            return {
                status: "error",
                errorCode: "connector_payload_invalid_result"
            };
        }

        try {
            const residentMatching =
                await this.serverTrustBoundaryService.matchResident({
                    verifiedContext,
                    sourceResident
                });

            return {
                status: "ready",
                verifiedContext,
                validatedPayload,
                residentMatching
            };
        } catch (err) {
            return {
                status: "error",
                errorCode: "resident_matching_unavailable"
            };
        }
    }

    isValidVerifiedContext(verifiedContext) {
        if (
            !verifiedContext ||
            typeof verifiedContext !== "object" ||
            Array.isArray(verifiedContext)
        ) {
            return false;
        }

        return Boolean(
            typeof verifiedContext.connectorId === "string" &&
            verifiedContext.connectorId.trim() &&
            typeof verifiedContext.facilityId === "string" &&
            verifiedContext.facilityId.trim()
        );
    }

    trustError(errorCode, status = "error") {
        return {
            status,
            errorCode
        };
    }
}

module.exports = ConnectorIngestionService;
