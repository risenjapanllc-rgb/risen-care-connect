"use strict";

/**
 * Connector Registration Repository Interface / Contract
 *
 * Responsibility:
 * - retrieve the server-side registration for a connectorId
 * - return the registered facility association for that connector
 * - do not perform credential verification here
 *
 * Design note:
 * - null is treated as the formal not-found representation for no registration
 * - unexpected non-object values or malformed objects are treated as contract
 *   violations and handled as an error by the verifier
 */
class ConnectorRegistrationRepository {
    /**
     * Lookup the connector registration by connectorId.
     *
     * @param {Object} params
     * @param {string} params.connectorId - connector identifier to look up
     *
     * @returns {Promise<Object|null>} A registration object like:
     *   {
     *     connectorId: "connector-123",
     *     facilityId: "facility-abc",
     *     active: true
     *   }
     *   or null when the connector is not registered.
     *
     * @throws {Error} When repository access fails or the implementation is not ready.
     */
    async getRegistration({ connectorId }) {
        if (!connectorId) {
            return null;
        }

        // Actual repository implementation is intentionally deferred.
        throw new Error(
            "ConnectorRegistrationRepository.getRegistration is not yet implemented. " +
            "Subclass or mock this method in tests."
        );
    }
}

module.exports = ConnectorRegistrationRepository;
