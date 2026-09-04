"use strict";

/**
 * RISEN CARE Server Trust Boundary Module
 *
 * Exports the core classes for Server Trust Boundary implementation.
 */

const ServerTrustBoundaryService =
    require("./ServerTrustBoundaryService");

const ResidentRepository =
    require("./ResidentRepository");

const ConnectorRegistrationRepository =
    require("./ConnectorRegistrationRepository");

const ConnectorRegistrationVerifier =
    require("./ConnectorRegistrationVerifier");

const ConnectorCredentialVerifier =
    require("./ConnectorCredentialVerifier");

module.exports = {
    ServerTrustBoundaryService,
    ResidentRepository,
    ConnectorRegistrationRepository,
    ConnectorRegistrationVerifier,
    ConnectorCredentialVerifier
};
