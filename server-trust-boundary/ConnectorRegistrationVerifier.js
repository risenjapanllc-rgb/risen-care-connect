"use strict";

/**
 * Connector Registration Verifier
 *
 * Responsibility:
 * - accept a connectorId from the incoming request/context
 * - ask the server-side connector registration repository whether that connector
 *   is registered and active for a facility
 * - return registrationContext only when the server-side registration confirms it
 *
 * Important:
 * - connectorId is an identifier, not a credential.
 * - registered means the connector is known and active in server-side registration.
 * - it does not mean authenticated, verified, or allowed to start privileged processing.
 * - credential verification, secret comparison, hashing, JWT checks, API key
 *   checks, and final human authentication remain separate concerns.
 * - this implementation does not imply full Connector authentication is complete.
 */
class ConnectorRegistrationVerifier {
    /**
     * @param {Object} config
     * @param {ConnectorRegistrationRepository} config.connectorRegistrationRepository
     */
    constructor({ connectorRegistrationRepository } = {}) {
        if (!connectorRegistrationRepository) {
            throw new Error("ConnectorRegistrationVerifier requires connectorRegistrationRepository");
        }

        this.connectorRegistrationRepository = connectorRegistrationRepository;
    }

    /**
     * Check connector registration using server-side registration data only.
     *
     * @param {Object} params
     * @param {string} params.connectorId - connector identifier from the incoming context
     * @param {string} [params.facilityId] - client-supplied facilityId, ignored
     *
     * @returns {Promise<Object>}
     *   registered: {
     *     status: "registered",
     *     registrationContext: { connectorId, facilityId }
     *   }
     *   denied: {
     *     status: "denied",
     *     verifiedContext: null,
     *     errorCode: "..."
     *   }
     *   error: {
     *     status: "error",
     *     verifiedContext: null,
     *     errorCode: "..."
     *   }
     *
     * Notes:
     * - connectorId is an identifier, not a credential.
     * - registered does not imply authenticated or verified.
     * - registrationContext alone must not be treated as permission to start privileged processing.
     * - future credential verification may later produce a verifiedContext object.
     */
    async verify({ connectorId, facilityId } = {}) {
        // Default Deny: connectorId is required for any registration lookup.
        const normalizedConnectorId = String(connectorId || "").trim();
        if (!normalizedConnectorId) {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_missing_id"
            };
        }

        let registration;
        try {
            registration = await this.connectorRegistrationRepository.getRegistration({
                connectorId: normalizedConnectorId
            });
        } catch (err) {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_repository_unavailable"
            };
        }

        // null is the repository's formal not-found representation.
        if (registration === null) {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_not_registered"
            };
        }

        // Contract violation: unexpected non-object results should not be treated as not-found.
        if (!registration || typeof registration !== "object") {
            return {
                status: "error",
                verifiedContext: null,
                errorCode: "connector_repository_invalid_result"
            };
        }

        if (registration.active !== true) {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_inactive"
            };
        }

        const serverFacilityId = registration.facilityId;
        if (!serverFacilityId) {
            return {
                status: "denied",
                verifiedContext: null,
                errorCode: "connector_registration_missing_facility"
            };
        }

        // Ignore any client-supplied facilityId; only the server-side registration can decide.
        return {
            status: "registered",
            registrationContext: {
                connectorId: registration.connectorId || normalizedConnectorId,
                facilityId: String(serverFacilityId)
            }
        };
    }
}

module.exports = ConnectorRegistrationVerifier;
