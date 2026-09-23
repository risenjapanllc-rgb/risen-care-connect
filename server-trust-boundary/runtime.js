"use strict";

const ConnectorIngestionService =
    require("./ConnectorIngestionService");

const ServerTrustBoundaryIngestionService =
    require("./ServerTrustBoundaryIngestionService");

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

const SupabaseSemanticRecordPersistenceRepository =
    require("./SupabaseSemanticRecordPersistenceRepository");

const SourceDocumentPayloadValidator =
    require("./SourceDocumentPayloadValidator");

const SupabaseSourceDocumentPersistenceRepository =
    require("./SupabaseSourceDocumentPersistenceRepository");

const SourceDocumentIngestionService =
    require("./SourceDocumentIngestionService");

const SourceFieldMappingPayloadValidator =
    require("./SourceFieldMappingPayloadValidator");

const SupabaseSourceFieldMappingPersistenceRepository =
    require("./SupabaseSourceFieldMappingPersistenceRepository");

const SourceFieldMappingIngestionService =
    require("./SourceFieldMappingIngestionService");

const SupabaseSourceFieldMappingQueryRepository =
    require("./SupabaseSourceFieldMappingQueryRepository");

const SourceFieldMappingQueryService =
    require("./SourceFieldMappingQueryService");

const SourceFieldInterpretationPayloadValidator =
    require("./SourceFieldInterpretationPayloadValidator");

const SupabaseSourceFieldInterpretationPersistenceRepository =
    require("./SupabaseSourceFieldInterpretationPersistenceRepository");

const SourceFieldInterpretationIngestionService =
    require("./SourceFieldInterpretationIngestionService");

const SupabaseSourceFieldInterpretationQueryRepository =
    require("./SupabaseSourceFieldInterpretationQueryRepository");

const SourceFieldInterpretationQueryService =
    require("./SourceFieldInterpretationQueryService");

const ConnectorResidentCandidateRepository =
    require("./ConnectorResidentCandidateRepository");

const ConnectorResidentCandidateService =
    require("./ConnectorResidentCandidateService");

const SupabaseSourceResidentLinkPersistenceRepository =
    require("./SupabaseSourceResidentLinkPersistenceRepository");

const SourceResidentLinkPersistenceService =
    require("./SourceResidentLinkPersistenceService");

const SupabaseSourceResidentLinkQueryRepository =
    require("./SupabaseSourceResidentLinkQueryRepository");

const SourceResidentLinkQueryService =
    require("./SourceResidentLinkQueryService");

const SupabaseSourceResidentMappingPersistenceRepository =
    require("./SupabaseSourceResidentMappingPersistenceRepository");

const SourceResidentMappingPersistenceService =
    require("./SourceResidentMappingPersistenceService");

const SupabaseSourceResidentMappingQueryRepository =
    require("./SupabaseSourceResidentMappingQueryRepository");

const SourceResidentMappingQueryService =
    require("./SourceResidentMappingQueryService");

const SupabaseSourceRecordIdentityMappingRepository =
    require("./SupabaseSourceRecordIdentityMappingRepository");

const SourceRecordIdentityMappingPersistenceService =
    require("./SourceRecordIdentityMappingPersistenceService");

const SourceRecordIdentityMappingQueryService =
    require("./SourceRecordIdentityMappingQueryService");
const SupabaseConfirmedDocumentTypeRepository =
    require("./SupabaseConfirmedDocumentTypeRepository");
const ConfirmedDocumentTypePersistenceService =
    require("./ConfirmedDocumentTypePersistenceService");
const ConfirmedDocumentTypeQueryService =
    require("./ConfirmedDocumentTypeQueryService");

const SupabaseResidentAdmissionDecisionRepository =
    require("./SupabaseResidentAdmissionDecisionRepository");
const ResidentAdmissionDecisionPersistenceService =
    require("./ResidentAdmissionDecisionPersistenceService");
const ResidentAdmissionDecisionQueryService =
    require("./ResidentAdmissionDecisionQueryService");

const SupabaseResidentCreationRepository =
    require("./SupabaseResidentCreationRepository");

const ResidentCreationService =
    require("./ResidentCreationService");
const SupabaseConnectorResidentAdmissionRepository =
    require("./SupabaseConnectorResidentAdmissionRepository");
const ConnectorResidentAdmissionService =
    require("./ConnectorResidentAdmissionService");
const SupabaseConnectorResidentProfileRepository =
    require("./SupabaseConnectorResidentProfileRepository");
const ConnectorResidentProfileService =
    require("./ConnectorResidentProfileService");
const SupabaseConnectorResidentProfileQueryRepository =
    require("./SupabaseConnectorResidentProfileQueryRepository");
const ConnectorResidentProfileQueryService =
    require("./ConnectorResidentProfileQueryService");

const VoiceCallService =
    require("./VoiceCallService");

const VoiceCallHttpAdapter =
    require("./VoiceCallHttpAdapter");

const VoiceCallTransport =
    require("./VoiceCallTransport");

const {
    SupabaseFacilityPhoneNumberRepository
} =
    require(
        "../server-domain/storage/SupabaseFacilityPhoneNumberRepository"
    );

const {
    createOutboundCall
} = require("../services/vonageVoiceService");


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

const SemanticPersistenceService =
    require("../server-domain/storage/SemanticPersistenceService");

const SupabaseConnectorSemanticRecordPreviewRepository =
    require("./SupabaseConnectorSemanticRecordPreviewRepository");

const ConnectorSemanticRecordPreviewService =
    require("./ConnectorSemanticRecordPreviewService");
const SupabaseConnectorSemanticLogicalRecordRepository =
    require("./SupabaseConnectorSemanticLogicalRecordRepository");
const ConnectorSemanticLogicalRecordService =
    require("./ConnectorSemanticLogicalRecordService");
const SupabaseConnectorSemanticLogicalRecordPersistenceRepository =
    require("./SupabaseConnectorSemanticLogicalRecordPersistenceRepository");
const ConnectorSemanticLogicalRecordPersistenceService =
    require("./ConnectorSemanticLogicalRecordPersistenceService");

const ConnectorSupportRecordPersistenceService =
    require("./ConnectorSupportRecordPersistenceService");

const ConnectorSupportRecordBatchWriteService =
    require("./ConnectorSupportRecordBatchWriteService");

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
    const accessTokenProvider =
        new SupabaseConnectorTrustAuthProvider({
            supabaseUrl,
            apiKey,
            email: connectorTrustEmail,
            password: connectorTrustPassword
        });

    const connectorRegistrationRepository =
        new SupabaseConnectorRegistrationRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorRegistrationVerifier =
        new ConnectorRegistrationVerifier({
            connectorRegistrationRepository
        });

    const credentialVerifierBackend =
        new SupabaseConnectorCredentialVerifierBackend({
            supabaseUrl,
            apiKey,
            accessTokenProvider
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

    const semanticRecordPreviewRepository =
        new SupabaseConnectorSemanticRecordPreviewRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorSemanticRecordPreviewService =
        new ConnectorSemanticRecordPreviewService({
            connectorTrustService,
            semanticRecordPreviewRepository
        });

    const semanticLogicalRecordRepository =
        new SupabaseConnectorSemanticLogicalRecordRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorSemanticLogicalRecordService =
        new ConnectorSemanticLogicalRecordService({
            connectorTrustService,
            repository: semanticLogicalRecordRepository
        });

    const semanticLogicalRecordPersistenceRepository =
        new SupabaseConnectorSemanticLogicalRecordPersistenceRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorSemanticLogicalRecordPersistenceService =
        new ConnectorSemanticLogicalRecordPersistenceService({
            connectorTrustService,
            repository:
                semanticLogicalRecordPersistenceRepository
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

    const semanticRecordPersistenceRepository =
        new SupabaseSemanticRecordPersistenceRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const semanticPersistenceService =
        new SemanticPersistenceService({
            semanticRecordPersistenceRepository
        });

    const connectorSupportRecordPersistenceService =
        new ConnectorSupportRecordPersistenceService({
            semanticRecordPersistenceRepository
        });

    const connectorSupportRecordBatchWriteService =
        new ConnectorSupportRecordBatchWriteService({
            connectorTrustService,
            persistenceService:
                connectorSupportRecordPersistenceService,
            semanticRecordPersistenceRepository,
            maxBatchSize: 100
        });

    const semanticIngestionService =
        new SemanticIngestionService({
            semanticRecordPipeline,
            semanticStorageDecisionService,
            semanticPersistenceService
        });

    const serverTrustBoundaryIngestionService =
        new ServerTrustBoundaryIngestionService({
            connectorIngestionService,
            semanticIngestionService
        });

    const sourceDocumentPayloadValidator =
        new SourceDocumentPayloadValidator();

    const sourceDocumentPersistenceRepository =
        new SupabaseSourceDocumentPersistenceRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceDocumentIngestionService =
        new SourceDocumentIngestionService({
            connectorTrustService,
            sourceDocumentPayloadValidator,
            sourceDocumentPersistenceRepository
        });

    const sourceFieldMappingPayloadValidator =
        new SourceFieldMappingPayloadValidator();

    const sourceFieldMappingPersistenceRepository =
        new SupabaseSourceFieldMappingPersistenceRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceFieldMappingIngestionService =
        new SourceFieldMappingIngestionService({
            connectorTrustService,
            sourceFieldMappingPayloadValidator,
            sourceFieldMappingPersistenceRepository
        });

    const sourceFieldMappingQueryRepository =
        new SupabaseSourceFieldMappingQueryRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceFieldMappingQueryService =
        new SourceFieldMappingQueryService({
            connectorTrustService,
            sourceFieldMappingQueryRepository
        });

    const sourceFieldInterpretationPayloadValidator =
        new SourceFieldInterpretationPayloadValidator();

    const sourceFieldInterpretationPersistenceRepository =
        new SupabaseSourceFieldInterpretationPersistenceRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceFieldInterpretationIngestionService =
        new SourceFieldInterpretationIngestionService({
            connectorTrustService,
            sourceFieldInterpretationPayloadValidator,
            sourceFieldInterpretationPersistenceRepository
        });

    const sourceFieldInterpretationQueryRepository =
        new SupabaseSourceFieldInterpretationQueryRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceFieldInterpretationQueryService =
        new SourceFieldInterpretationQueryService({
            connectorTrustService,
            sourceFieldInterpretationQueryRepository
        });


    const connectorResidentCandidateRepository =
        new ConnectorResidentCandidateRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorResidentCandidateService =
        new ConnectorResidentCandidateService({
            connectorTrustService,
            residentCandidateRepository:
                connectorResidentCandidateRepository
        });

    const sourceResidentLinkPersistenceRepository =
        new SupabaseSourceResidentLinkPersistenceRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceResidentLinkPersistenceService =
        new SourceResidentLinkPersistenceService({
            connectorTrustService,
            sourceResidentLinkPersistenceRepository
        });

    const sourceResidentLinkQueryRepository =
        new SupabaseSourceResidentLinkQueryRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceResidentLinkQueryService =
        new SourceResidentLinkQueryService({
            connectorTrustService,
            sourceResidentLinkQueryRepository
        });

    const sourceResidentMappingPersistenceRepository =
        new SupabaseSourceResidentMappingPersistenceRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceResidentMappingPersistenceService =
        new SourceResidentMappingPersistenceService({
            connectorTrustService,
            sourceResidentMappingPersistenceRepository
        });

    const sourceResidentMappingQueryRepository =
        new SupabaseSourceResidentMappingQueryRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceResidentMappingQueryService =
        new SourceResidentMappingQueryService({
            connectorTrustService,
            sourceResidentMappingQueryRepository
        });

    const sourceRecordIdentityMappingRepository =
        new SupabaseSourceRecordIdentityMappingRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const sourceRecordIdentityMappingPersistenceService =
        new SourceRecordIdentityMappingPersistenceService({
            connectorTrustService,
            sourceRecordIdentityMappingRepository
        });

    const sourceRecordIdentityMappingQueryService =
        new SourceRecordIdentityMappingQueryService({
            connectorTrustService,
            sourceRecordIdentityMappingRepository
        });

    const confirmedDocumentTypeRepository =
        new SupabaseConfirmedDocumentTypeRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const confirmedDocumentTypePersistenceService =
        new ConfirmedDocumentTypePersistenceService({
            connectorTrustService,
            confirmedDocumentTypeRepository
        });

    const confirmedDocumentTypeQueryService =
        new ConfirmedDocumentTypeQueryService({
            connectorTrustService,
            confirmedDocumentTypeRepository
        });

    const residentAdmissionDecisionRepository =
        new SupabaseResidentAdmissionDecisionRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const residentAdmissionDecisionPersistenceService =
        new ResidentAdmissionDecisionPersistenceService({
            connectorTrustService,
            residentAdmissionDecisionRepository
        });

    const residentAdmissionDecisionQueryService =
        new ResidentAdmissionDecisionQueryService({
            connectorTrustService,
            residentAdmissionDecisionRepository
        });

    const residentCreationRepository =
        new SupabaseResidentCreationRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const residentCreationService =
        new ResidentCreationService({
            connectorTrustService,
            residentCreationRepository
        });

    const connectorResidentAdmissionRepository =
        new SupabaseConnectorResidentAdmissionRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorResidentAdmissionService =
        new ConnectorResidentAdmissionService({
            connectorTrustService,
            repository:
                connectorResidentAdmissionRepository
        });

    const connectorResidentProfileRepository =
        new SupabaseConnectorResidentProfileRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorResidentProfileService =
        new ConnectorResidentProfileService({
            connectorTrustService,
            repository:
                connectorResidentProfileRepository
        });

    const connectorResidentProfileQueryRepository =
        new SupabaseConnectorResidentProfileQueryRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const connectorResidentProfileQueryService =
        new ConnectorResidentProfileQueryService({
            connectorTrustService,
            repository:
                connectorResidentProfileQueryRepository
        });


    // ==========================================
    // Vonage Voice
    // ==========================================

    const facilityPhoneNumberRepository =
        new SupabaseFacilityPhoneNumberRepository({
            supabaseUrl,
            apiKey,
            accessTokenProvider
        });

    const vonageVoiceService = {
        createOutboundCall
    };

    const voiceCallService =
        new VoiceCallService({
            connectorTrustService,
            facilityPhoneNumberRepository,
            vonageVoiceService
        });


    const voiceCallHttpAdapter =
        new VoiceCallHttpAdapter({
            voiceCallService
        });

    /*
     * Voice TransportはHTTP Runtime側で
     * 共通のConnectorCredentialTransportを注入して生成する。
     */
    return {
        serverTrustBoundaryIngestionService,
        sourceDocumentIngestionService,
        sourceFieldMappingIngestionService,
        sourceFieldMappingQueryService,
        sourceFieldInterpretationIngestionService,
        sourceFieldInterpretationQueryService,
        connectorResidentCandidateService,
        sourceResidentLinkPersistenceService,
        sourceResidentLinkQueryService,
        sourceResidentMappingPersistenceService,
        sourceResidentMappingQueryService,
        sourceRecordIdentityMappingPersistenceService,
        sourceRecordIdentityMappingQueryService,
        confirmedDocumentTypePersistenceService,
        confirmedDocumentTypeQueryService,
        residentAdmissionDecisionPersistenceService,
        residentAdmissionDecisionQueryService,
        connectorSemanticRecordPreviewService,
        connectorSemanticLogicalRecordService,
        connectorSemanticLogicalRecordPersistenceService,
        connectorSupportRecordBatchWriteService,
        residentCreationService,
        connectorResidentAdmissionService,
        connectorResidentProfileService,
        connectorResidentProfileQueryService,
        voiceCallService,
        voiceCallHttpAdapter
    };
}

module.exports = {
    createServerTrustBoundaryRuntime
};
