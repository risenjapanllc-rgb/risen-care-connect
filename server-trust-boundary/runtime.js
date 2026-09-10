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

const SupabaseRecordIdentityCandidateProvider =
    require("./SupabaseRecordIdentityCandidateProvider");

const SupabaseExistingSemanticRecordRepository =
    require("./SupabaseExistingSemanticRecordRepository");

const ResidentMatcher =
    require("../server-domain/resident/ResidentMatcher");

const RecordIdentityResolver =
    require("../server-domain/record/RecordIdentityResolver");

const RecordChangeResolver =
    require("../server-domain/record/RecordChangeResolver");

const SemanticRecordValidator =
    require("../server-domain/semantic/SemanticRecordValidator");

const SemanticContentCanonicalizer =
    require("../server-domain/semantic/SemanticContentCanonicalizer");

const SemanticContentHasher =
    require("../server-domain/semantic/SemanticContentHasher");

const CanonicalizationVersionAuthority =
    require("../server-domain/semantic/CanonicalizationVersionAuthority");

const CanonicalizationCompatibilityPolicy =
    require("../server-domain/semantic/CanonicalizationCompatibilityPolicy");

const SemanticContentProcessor =
    require("../server-domain/semantic/SemanticContentProcessor");

const SemanticRecordPipeline =
    require("../server-domain/semantic/SemanticRecordPipeline");

const SemanticStoragePolicy =
    require("../server-domain/storage/SemanticStoragePolicy");

const SemanticStorageDecisionService =
    require("../server-domain/storage/SemanticStorageDecisionService");

const SemanticIngestionService =
    require("../server-domain/storage/SemanticIngestionService");

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

    const recordIdentityCandidateProvider =
        new SupabaseRecordIdentityCandidateProvider({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const recordIdentityResolver =
        new RecordIdentityResolver({
            recordIdentityCandidateProvider
        });

    const semanticRecordValidator =
        new SemanticRecordValidator();

    const semanticContentCanonicalizer =
        new SemanticContentCanonicalizer();

    const semanticContentHasher =
        new SemanticContentHasher();

    const canonicalizationVersionAuthority =
        new CanonicalizationVersionAuthority();

    const semanticContentProcessor =
        new SemanticContentProcessor({
            semanticContentCanonicalizer,
            semanticContentHasher,
            canonicalizationVersionAuthority
        });

    const semanticRecordPipeline =
        new SemanticRecordPipeline({
            semanticRecordValidator,
            semanticContentProcessor,
            recordIdentityResolver
        });

    const existingSemanticRecordRepository =
        new SupabaseExistingSemanticRecordRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const canonicalizationCompatibilityPolicy =
        new CanonicalizationCompatibilityPolicy();

    const recordChangeResolver =
        new RecordChangeResolver({
            canonicalizationCompatibilityPolicy
        });

    const semanticStoragePolicy =
        new SemanticStoragePolicy();

    const semanticStorageDecisionService =
        new SemanticStorageDecisionService({
            existingSemanticRecordRepository,
            recordChangeResolver,
            semanticStoragePolicy
        });

    const semanticIngestionService =
        new SemanticIngestionService({
            semanticRecordPipeline,
            semanticStorageDecisionService
        });

    return {
        connectorIngestionService,
        semanticIngestionService
    };
}

module.exports = {
    createServerTrustBoundaryRuntime
};
