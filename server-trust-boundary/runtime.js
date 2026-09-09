"use strict";

const ConnectorIngestionService =
    require("./ConnectorIngestionService");

const ConnectorTrustService =
    require("./ConnectorTrustService");

const ConnectorRegistrationVerifier =
    require("./ConnectorRegistrationVerifier");

const ConnectorCredentialVerifier =
    require("./ConnectorCredentialVerifier");

const ServerTrustBoundaryService =
    require("./ServerTrustBoundaryService");

const ConnectorPayloadValidator =
    require("./ConnectorPayloadValidator");

const SupabaseConnectorRegistrationRepository =
    require("./SupabaseConnectorRegistrationRepository");

const SupabaseConnectorCredentialVerifierBackend =
    require("./SupabaseConnectorCredentialVerifierBackend");

const SupabaseConnectorTrustAuthProvider =
    require("./SupabaseConnectorTrustAuthProvider");

const SupabaseResidentRepository =
    require("./SupabaseResidentRepository");

const ResidentMatcher =
    require("../server-domain/resident/ResidentMatcher");

/**
 * Build the Server Trust Boundary runtime.
 *
 * This composition root is server-side only.
 * It must not be used by the facility-side Local Connector runtime.
 */
function createServerTrustBoundaryRuntime({
    supabaseUrl,
    apiKey,
    connectorTrustEmail,
    connectorTrustPassword
} = {}) {
    const connectorRegistrationRepository =
        new SupabaseConnectorRegistrationRepository({
            supabaseUrl,
            apiKey
        });

    const connectorRegistrationVerifier =
        new ConnectorRegistrationVerifier({
            connectorRegistrationRepository
        });

    const credentialVerifierBackend =
        new SupabaseConnectorCredentialVerifierBackend({
            supabaseUrl,
            apiKey
        });

    const connectorCredentialVerifier =
        new ConnectorCredentialVerifier({
            credentialVerifierBackend
        });

    const connectorTrustService =
        new ConnectorTrustService({
            connectorRegistrationVerifier,
            connectorCredentialVerifier
        });

    const accessTokenProvider =
        new SupabaseConnectorTrustAuthProvider({
            supabaseUrl,
            apiKey,
            email: connectorTrustEmail,
            password: connectorTrustPassword
        });

    const residentRepository =
        new SupabaseResidentRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const residentMatcher =
        new ResidentMatcher();

    const serverTrustBoundaryService =
        new ServerTrustBoundaryService({
            residentRepository,
            residentMatcher
        });

    const connectorPayloadValidator =
        new ConnectorPayloadValidator();

    const connectorIngestionService =
        new ConnectorIngestionService({
            connectorTrustService,
            connectorPayloadValidator,
            serverTrustBoundaryService
        });

    return {
        connectorIngestionService
    };
}

module.exports = {
    createServerTrustBoundaryRuntime
};
