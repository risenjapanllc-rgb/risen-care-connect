"use strict";

/**
 * Connector Credential Verifier
 *
 * Responsibility:
 * - determine whether a given connectorId and credential pair is acceptable
 * - provide a minimal authentication boundary for the connector identity itself
 *
 * Important:
 * - connectorId is an identifier, not a credential.
 * - credential is treated as an opaque secret-like value.
 * - no trimming or normalization beyond empty-value rejection is performed.
 * - this verifier does not determine facilityId.
 * - this verifier does not produce verifiedContext, registrationContext, or facilityId.
 * - successful credential verification is separate from server-side registration.
 * - future credential verification must be paired with registration verification
 *   before privileged processing is allowed.
 */
class ConnectorCredentialVerifier {
    /**
     * @param {Object} config
     * @param {Object} config.credentialVerifierBackend - backend that verifies the credential
     */
    constructor({ credentialVerifierBackend } = {}) {
        if (!credentialVerifierBackend) {
            throw new Error("ConnectorCredentialVerifier requires credentialVerifierBackend");
        }

        this.credentialVerifierBackend = credentialVerifierBackend;
    }

    /**
     * Verify a connector credential using a backend dependency only.
     *
     * @param {Object} params
     * @param {string} params.connectorId
     * @param {any} params.credential
     *
     * @returns {Promise<Object>}
     *   authenticated: { status: "authenticated", authenticatedConnector: { connectorId } }
     *   denied: { status: "denied", errorCode: "..." }
     *   error: { status: "error", errorCode: "..." }
     *
     * Notes:
     * - connectorId alone is never sufficient.
     * - credential is never returned in the result.
     * - facilityId is not produced here.
     * - verifiedContext is not produced here.
     */
    async verify({ connectorId, credential } = {}) {
        const normalizedConnectorId = String(connectorId || "");
        if (normalizedConnectorId === "") {
            return {
                status: "denied",
                errorCode: "connector_missing_id"
            };
        }

        if (credential === undefined || credential === null || credential === "") {
            return {
                status: "denied",
                errorCode: "connector_missing_credential"
            };
        }

        let backendResult;
        try {
            backendResult = await this.credentialVerifierBackend.verifyCredential({
                connectorId: normalizedConnectorId,
                credential
            });
        } catch (err) {
            return {
                status: "error",
                errorCode: "connector_credential_backend_unavailable"
            };
        }

        if (backendResult && typeof backendResult === "object" && backendResult.authenticated === true) {
            return {
                status: "authenticated",
                authenticatedConnector: {
                    connectorId: normalizedConnectorId
                }
            };
        }

        if (backendResult && typeof backendResult === "object" && backendResult.authenticated === false) {
            return {
                status: "denied",
                errorCode: "connector_credential_invalid"
            };
        }

        return {
            status: "error",
            errorCode: "connector_credential_backend_invalid_result"
        };
    }
}

module.exports = ConnectorCredentialVerifier;
