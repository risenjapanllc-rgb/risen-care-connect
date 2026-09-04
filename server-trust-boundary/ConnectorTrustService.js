"use strict";

/**
 * Connector Trust Service
 *
 * Combines registration verification and credential verification in a default-deny
 * security flow. The service never trusts client-supplied facilityId and never
 * exposes dependency error details.
 */
class ConnectorTrustService {
    constructor({ connectorRegistrationVerifier, connectorCredentialVerifier } = {}) {
        if (!connectorRegistrationVerifier) {
            throw new Error("ConnectorTrustService requires connectorRegistrationVerifier");
        }
        if (!connectorCredentialVerifier) {
            throw new Error("ConnectorTrustService requires connectorCredentialVerifier");
        }

        this.connectorRegistrationVerifier = connectorRegistrationVerifier;
        this.connectorCredentialVerifier = connectorCredentialVerifier;
    }

    async authenticate({ connectorId, credential, facilityId } = {}) {
        const normalizedConnectorId = String(connectorId || "").trim();

        if (!normalizedConnectorId) {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_missing_id"
            };
        }

        if (credential === undefined || credential === null || credential === "") {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_missing_credential"
            };
        }

        let registrationResult;
        try {
            registrationResult = await this.connectorRegistrationVerifier.verify({
                connectorId: normalizedConnectorId
            });
        } catch (err) {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_registration_unavailable"
            };
        }

        if (!registrationResult || typeof registrationResult !== "object") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_registration_invalid_result"
            };
        }

        if (registrationResult.status === "denied") {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_registration_denied"
            };
        }

        if (registrationResult.status === "error") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_registration_unavailable"
            };
        }

        if (registrationResult.status !== "registered") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_registration_invalid_result"
            };
        }

        const registrationContext = registrationResult.registrationContext;
        if (!registrationContext || typeof registrationContext !== "object") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_registration_invalid_result"
            };
        }

        const registrationConnectorId = registrationContext.connectorId;
        const registrationFacilityId = registrationContext.facilityId;
        if (!registrationConnectorId || !registrationFacilityId) {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_registration_invalid_result"
            };
        }

        let credentialResult;
        try {
            credentialResult = await this.connectorCredentialVerifier.verify({
                connectorId: normalizedConnectorId,
                credential
            });
        } catch (err) {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_credential_unavailable"
            };
        }

        if (!credentialResult || typeof credentialResult !== "object") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_credential_invalid_result"
            };
        }

        if (credentialResult.status === "denied") {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_credential_denied"
            };
        }

        if (credentialResult.status === "error") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_credential_unavailable"
            };
        }

        if (credentialResult.status !== "authenticated") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_credential_invalid_result"
            };
        }

        const authenticatedConnector = credentialResult.authenticatedConnector;
        if (!authenticatedConnector || typeof authenticatedConnector !== "object") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_credential_invalid_result"
            };
        }

        const authenticatedConnectorId = authenticatedConnector.connectorId;
        if (!authenticatedConnectorId) {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_credential_invalid_result"
            };
        }

        if (registrationConnectorId !== authenticatedConnectorId) {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_identity_mismatch"
            };
        }

        if (registrationConnectorId !== normalizedConnectorId) {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_identity_mismatch"
            };
        }

        const verifiedContext = {
            connectorId: registrationConnectorId,
            facilityId: registrationFacilityId
        };

        return {
            status: "verified",
            verifiedContext
        };
    }
}

module.exports = ConnectorTrustService;
