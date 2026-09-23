"use strict";

const {
    createServerTrustBoundaryRuntime
} = require("./runtime");

const ServerTrustBoundaryHttpAdapter =
    require("./ServerTrustBoundaryHttpAdapter");

const ConnectorCredentialTransport =
    require("./ConnectorCredentialTransport");

const ServerTrustBoundaryTransport =
    require("./ServerTrustBoundaryTransport");

const SourceDocumentHttpAdapter =
    require("./SourceDocumentHttpAdapter");

const SourceDocumentTransport =
    require("./SourceDocumentTransport");

const SourceFieldMappingHttpAdapter =
    require("./SourceFieldMappingHttpAdapter");

const SourceFieldMappingTransport =
    require("./SourceFieldMappingTransport");

const SourceFieldMappingQueryHttpAdapter =
    require("./SourceFieldMappingQueryHttpAdapter");

const SourceFieldMappingQueryTransport =
    require("./SourceFieldMappingQueryTransport");

const SourceFieldInterpretationHttpAdapter =
    require("./SourceFieldInterpretationHttpAdapter");

const SourceFieldInterpretationTransport =
    require("./SourceFieldInterpretationTransport");

const SourceFieldInterpretationQueryHttpAdapter =
    require("./SourceFieldInterpretationQueryHttpAdapter");

const SourceFieldInterpretationQueryTransport =
    require("./SourceFieldInterpretationQueryTransport");

const ConnectorResidentCandidateHttpAdapter =
    require("./ConnectorResidentCandidateHttpAdapter");

const ConnectorResidentCandidateTransport =
    require("./ConnectorResidentCandidateTransport");

const SourceResidentLinkHttpAdapter =
    require("./SourceResidentLinkHttpAdapter");

const SourceResidentLinkTransport =
    require("./SourceResidentLinkTransport");

const SourceResidentLinkQueryHttpAdapter =
    require("./SourceResidentLinkQueryHttpAdapter");

const SourceResidentLinkQueryTransport =
    require("./SourceResidentLinkQueryTransport");

const SourceResidentMappingHttpAdapter =
    require("./SourceResidentMappingHttpAdapter");

const SourceResidentMappingTransport =
    require("./SourceResidentMappingTransport");

const SourceResidentMappingQueryHttpAdapter =
    require("./SourceResidentMappingQueryHttpAdapter");

const SourceResidentMappingQueryTransport =
    require("./SourceResidentMappingQueryTransport");

const SourceRecordIdentityMappingHttpAdapter =
    require("./SourceRecordIdentityMappingHttpAdapter");

const SourceRecordIdentityMappingTransport =
    require("./SourceRecordIdentityMappingTransport");

const SourceRecordIdentityMappingQueryHttpAdapter =
    require("./SourceRecordIdentityMappingQueryHttpAdapter");

const SourceRecordIdentityMappingQueryTransport =
    require("./SourceRecordIdentityMappingQueryTransport");

const ConfirmedDocumentTypeHttpAdapter =
    require("./ConfirmedDocumentTypeHttpAdapter");

const ConfirmedDocumentTypeTransport =
    require("./ConfirmedDocumentTypeTransport");

const ConfirmedDocumentTypeQueryHttpAdapter =
    require("./ConfirmedDocumentTypeQueryHttpAdapter");

const ConfirmedDocumentTypeQueryTransport =
    require("./ConfirmedDocumentTypeQueryTransport");

const ResidentAdmissionDecisionHttpAdapter =
    require("./ResidentAdmissionDecisionHttpAdapter");
const ResidentAdmissionDecisionTransport =
    require("./ResidentAdmissionDecisionTransport");
const ResidentAdmissionDecisionQueryHttpAdapter =
    require("./ResidentAdmissionDecisionQueryHttpAdapter");
const ResidentAdmissionDecisionQueryTransport =
    require("./ResidentAdmissionDecisionQueryTransport");

const ConnectorSemanticRecordPreviewHttpAdapter =
    require("./ConnectorSemanticRecordPreviewHttpAdapter");

const ConnectorSemanticRecordPreviewTransport =
    require("./ConnectorSemanticRecordPreviewTransport");
const ConnectorSemanticLogicalRecordHttpAdapter =
    require("./ConnectorSemanticLogicalRecordHttpAdapter");
const ConnectorSemanticLogicalRecordTransport =
    require("./ConnectorSemanticLogicalRecordTransport");
const ConnectorSemanticLogicalRecordPersistenceHttpAdapter =
    require("./ConnectorSemanticLogicalRecordPersistenceHttpAdapter");
const ConnectorSemanticLogicalRecordPersistenceTransport =
    require("./ConnectorSemanticLogicalRecordPersistenceTransport");

const ConnectorSupportRecordBatchWriteHttpAdapter =
    require("./ConnectorSupportRecordBatchWriteHttpAdapter");

const ConnectorSupportRecordBatchWriteTransport =
    require("./ConnectorSupportRecordBatchWriteTransport");

const ResidentCreationHttpAdapter =
    require("./ResidentCreationHttpAdapter");

const ResidentCreationTransport =
    require("./ResidentCreationTransport");
const ConnectorResidentAdmissionHttpAdapter =
    require("./ConnectorResidentAdmissionHttpAdapter");
const ConnectorResidentAdmissionTransport =
    require("./ConnectorResidentAdmissionTransport");


const VoiceCallTransport =
    require("./VoiceCallTransport");


const {
    createServerTrustBoundaryApp
} = require("./createServerTrustBoundaryApp");

/**
 * Build the complete Server Trust Boundary HTTP runtime.
 *
 * Server-side only.
 * Must not be used by the facility-side Local Connector runtime.
 */
function createServerTrustBoundaryHttpRuntime({
    supabaseUrl,
    apiKey,
    connectorTrustEmail,
    connectorTrustPassword,
    authorizationScheme,
    connectorIdHeader,
    endpointPath,
    jsonBodyLimit,
    sourceDocumentJsonBodyLimit,
    diagnosticLogger
} = {}) {
    if (
        typeof authorizationScheme !== "string" ||
        !authorizationScheme.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires authorizationScheme"
        );
    }

    if (
        typeof connectorIdHeader !== "string" ||
        !connectorIdHeader.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires connectorIdHeader"
        );
    }

    if (
        typeof endpointPath !== "string" ||
        !endpointPath.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires endpointPath"
        );
    }

    if (
        typeof jsonBodyLimit !== "string" ||
        !jsonBodyLimit.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires jsonBodyLimit"
        );
    }

    if (
        typeof sourceDocumentJsonBodyLimit !== "string" ||
        !sourceDocumentJsonBodyLimit.trim()
    ) {
        throw new Error(
            "createServerTrustBoundaryHttpRuntime requires sourceDocumentJsonBodyLimit"
        );
    }

    const coreRuntime =
        createServerTrustBoundaryRuntime({
            supabaseUrl,
            apiKey,
            connectorTrustEmail,
            connectorTrustPassword
        });

    const httpAdapter =
        new ServerTrustBoundaryHttpAdapter({
            ingestionService:
                coreRuntime.serverTrustBoundaryIngestionService,
            diagnosticLogger
        });

    const credentialTransport =
        new ConnectorCredentialTransport({
            authorizationScheme
        });

    const transport =
        new ServerTrustBoundaryTransport({
            httpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceDocumentHttpAdapter =
        new SourceDocumentHttpAdapter({
            ingestionService:
                coreRuntime.sourceDocumentIngestionService,
            diagnosticLogger
        });

    const sourceDocumentTransport =
        new SourceDocumentTransport({
            httpAdapter:
                sourceDocumentHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceFieldMappingHttpAdapter =
        new SourceFieldMappingHttpAdapter({
            ingestionService:
                coreRuntime.sourceFieldMappingIngestionService,
            diagnosticLogger
        });

    const sourceFieldMappingTransport =
        new SourceFieldMappingTransport({
            httpAdapter:
                sourceFieldMappingHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceFieldMappingQueryHttpAdapter =
        new SourceFieldMappingQueryHttpAdapter({
            queryService:
                coreRuntime.sourceFieldMappingQueryService,
            diagnosticLogger
        });

    const sourceFieldMappingQueryTransport =
        new SourceFieldMappingQueryTransport({
            httpAdapter:
                sourceFieldMappingQueryHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceFieldInterpretationHttpAdapter =
        new SourceFieldInterpretationHttpAdapter({
            ingestionService:
                coreRuntime.sourceFieldInterpretationIngestionService,
            diagnosticLogger
        });

    const sourceFieldInterpretationTransport =
        new SourceFieldInterpretationTransport({
            httpAdapter:
                sourceFieldInterpretationHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceFieldInterpretationQueryHttpAdapter =
        new SourceFieldInterpretationQueryHttpAdapter({
            queryService:
                coreRuntime.sourceFieldInterpretationQueryService,
            diagnosticLogger
        });

    const sourceFieldInterpretationQueryTransport =
        new SourceFieldInterpretationQueryTransport({
            httpAdapter:
                sourceFieldInterpretationQueryHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const connectorResidentCandidateHttpAdapter =
        new ConnectorResidentCandidateHttpAdapter({
            candidateService:
                coreRuntime.connectorResidentCandidateService,
            diagnosticLogger
        });

    const connectorResidentCandidateTransport =
        new ConnectorResidentCandidateTransport({
            httpAdapter:
                connectorResidentCandidateHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceResidentLinkHttpAdapter =
        new SourceResidentLinkHttpAdapter({
            persistenceService:
                coreRuntime.sourceResidentLinkPersistenceService,
            diagnosticLogger
        });

    const sourceResidentLinkTransport =
        new SourceResidentLinkTransport({
            httpAdapter:
                sourceResidentLinkHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceResidentLinkQueryHttpAdapter =
        new SourceResidentLinkQueryHttpAdapter({
            queryService:
                coreRuntime.sourceResidentLinkQueryService,
            diagnosticLogger
        });

    const sourceResidentLinkQueryTransport =
        new SourceResidentLinkQueryTransport({
            httpAdapter:
                sourceResidentLinkQueryHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceResidentMappingHttpAdapter =
        new SourceResidentMappingHttpAdapter({
            persistenceService:
                coreRuntime.sourceResidentMappingPersistenceService,
            diagnosticLogger
        });

    const sourceResidentMappingTransport =
        new SourceResidentMappingTransport({
            httpAdapter:
                sourceResidentMappingHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceResidentMappingQueryHttpAdapter =
        new SourceResidentMappingQueryHttpAdapter({
            queryService:
                coreRuntime.sourceResidentMappingQueryService,
            diagnosticLogger
        });

    const sourceResidentMappingQueryTransport =
        new SourceResidentMappingQueryTransport({
            httpAdapter:
                sourceResidentMappingQueryHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceRecordIdentityMappingHttpAdapter =
        new SourceRecordIdentityMappingHttpAdapter({
            persistenceService:
                coreRuntime.sourceRecordIdentityMappingPersistenceService,
            diagnosticLogger
        });

    const sourceRecordIdentityMappingTransport =
        new SourceRecordIdentityMappingTransport({
            httpAdapter:
                sourceRecordIdentityMappingHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const sourceRecordIdentityMappingQueryHttpAdapter =
        new SourceRecordIdentityMappingQueryHttpAdapter({
            queryService:
                coreRuntime.sourceRecordIdentityMappingQueryService,
            diagnosticLogger
        });

    const sourceRecordIdentityMappingQueryTransport =
        new SourceRecordIdentityMappingQueryTransport({
            httpAdapter:
                sourceRecordIdentityMappingQueryHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const confirmedDocumentTypeHttpAdapter =
        new ConfirmedDocumentTypeHttpAdapter({
            persistenceService:
                coreRuntime.confirmedDocumentTypePersistenceService,
            diagnosticLogger
        });

    const confirmedDocumentTypeTransport =
        new ConfirmedDocumentTypeTransport({
            httpAdapter: confirmedDocumentTypeHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const confirmedDocumentTypeQueryHttpAdapter =
        new ConfirmedDocumentTypeQueryHttpAdapter({
            queryService:
                coreRuntime.confirmedDocumentTypeQueryService,
            diagnosticLogger
        });

    const confirmedDocumentTypeQueryTransport =
        new ConfirmedDocumentTypeQueryTransport({
            httpAdapter: confirmedDocumentTypeQueryHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const residentAdmissionDecisionHttpAdapter =
        new ResidentAdmissionDecisionHttpAdapter({
            persistenceService:
                coreRuntime.residentAdmissionDecisionPersistenceService,
            diagnosticLogger
        });

    const residentAdmissionDecisionTransport =
        new ResidentAdmissionDecisionTransport({
            httpAdapter: residentAdmissionDecisionHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const residentAdmissionDecisionQueryHttpAdapter =
        new ResidentAdmissionDecisionQueryHttpAdapter({
            queryService:
                coreRuntime.residentAdmissionDecisionQueryService,
            diagnosticLogger
        });

    const residentAdmissionDecisionQueryTransport =
        new ResidentAdmissionDecisionQueryTransport({
            httpAdapter: residentAdmissionDecisionQueryHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const connectorSemanticRecordPreviewHttpAdapter =
        new ConnectorSemanticRecordPreviewHttpAdapter({
            previewService:
                coreRuntime.connectorSemanticRecordPreviewService,
            diagnosticLogger
        });

    const connectorSemanticRecordPreviewTransport =
        new ConnectorSemanticRecordPreviewTransport({
            httpAdapter:
                connectorSemanticRecordPreviewHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const connectorSemanticLogicalRecordHttpAdapter =
        new ConnectorSemanticLogicalRecordHttpAdapter({
            service:
                coreRuntime.connectorSemanticLogicalRecordService,
            diagnosticLogger
        });

    const connectorSemanticLogicalRecordTransport =
        new ConnectorSemanticLogicalRecordTransport({
            httpAdapter:
                connectorSemanticLogicalRecordHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const connectorSemanticLogicalRecordPersistenceHttpAdapter =
        new ConnectorSemanticLogicalRecordPersistenceHttpAdapter({
            service:
                coreRuntime
                    .connectorSemanticLogicalRecordPersistenceService,
            diagnosticLogger
        });

    const connectorSemanticLogicalRecordPersistenceTransport =
        new ConnectorSemanticLogicalRecordPersistenceTransport({
            httpAdapter:
                connectorSemanticLogicalRecordPersistenceHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const connectorSupportRecordBatchWriteHttpAdapter =
        new ConnectorSupportRecordBatchWriteHttpAdapter({
            batchWriteService:
                coreRuntime.connectorSupportRecordBatchWriteService,
            diagnosticLogger
        });

    const connectorSupportRecordBatchWriteTransport =
        new ConnectorSupportRecordBatchWriteTransport({
            httpAdapter:
                connectorSupportRecordBatchWriteHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const residentCreationHttpAdapter =
        new ResidentCreationHttpAdapter({
            residentCreationService:
                coreRuntime.residentCreationService,
            diagnosticLogger
        });

    const residentCreationTransport =
        new ResidentCreationTransport({
            httpAdapter:
                residentCreationHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const connectorResidentAdmissionHttpAdapter =
        new ConnectorResidentAdmissionHttpAdapter({
            service:
                coreRuntime.connectorResidentAdmissionService,
            diagnosticLogger
        });

    const connectorResidentAdmissionTransport =
        new ConnectorResidentAdmissionTransport({
            httpAdapter:
                connectorResidentAdmissionHttpAdapter,
            credentialTransport,
            connectorIdHeader
        });

    const voiceCallTransport =
        new VoiceCallTransport({
            httpAdapter:
                coreRuntime.voiceCallHttpAdapter,

            credentialTransport,

            connectorIdHeader
        });

    const app =
        createServerTrustBoundaryApp({
            transport,
            endpointPath,
            sourceDocumentTransport,
            sourceDocumentEndpointPath:
                "/connector/source-documents",
            sourceFieldMappingTransport,
            sourceFieldMappingQueryTransport,
            sourceFieldMappingEndpointPath:
                "/connector/source-field-mappings",
            sourceFieldInterpretationTransport,
            sourceFieldInterpretationQueryTransport,
            connectorResidentCandidateTransport,
            connectorResidentCandidateEndpointPath:
                "/connector/resident-candidates",
            sourceResidentLinkTransport,
            sourceResidentLinkQueryTransport,
            sourceResidentLinkEndpointPath:
                "/connector/source-resident-links",
            sourceResidentMappingTransport,
            sourceResidentMappingQueryTransport,
            sourceResidentMappingEndpointPath:
                "/connector/source-resident-mappings",
            sourceRecordIdentityMappingTransport,
            sourceRecordIdentityMappingQueryTransport,
            sourceRecordIdentityMappingEndpointPath:
                "/connector/source-record-identity-mapping",
            confirmedDocumentTypeTransport,
            confirmedDocumentTypeQueryTransport,
            confirmedDocumentTypeEndpointPath:
                "/connector/confirmed-document-type",
            residentAdmissionDecisionTransport,
            residentAdmissionDecisionQueryTransport,
            residentAdmissionDecisionEndpointPath:
                "/connector/resident-admission-decisions",
            connectorSemanticRecordPreviewTransport,
            connectorSemanticRecordPreviewEndpointPath:
                "/connector/semantic-record-preview",
            connectorSemanticLogicalRecordTransport,
            connectorSemanticLogicalRecordEndpointPath:
                "/connector/semantic-logical-record",
            connectorSemanticLogicalRecordPersistenceTransport,
            connectorSemanticLogicalRecordPersistenceEndpointPath:
                "/connector/semantic-logical-record-persistence",
            connectorSupportRecordBatchWriteTransport,
            connectorSupportRecordBatchWriteEndpointPath:
                "/connector/support-record-batch-write",
            residentCreationTransport,
            residentCreationEndpointPath:
                "/connector/residents",
            connectorResidentAdmissionTransport,
            connectorResidentAdmissionEndpointPath:
                "/connector/resident-admission",
            voiceCallTransport,
            voiceCallEndpointPath:
                "/connector/voice-calls",
            sourceFieldInterpretationEndpointPath:
                "/connector/source-field-interpretations",
            jsonBodyLimit,
            sourceDocumentJsonBodyLimit
        });

    return {
        app
    };
}

module.exports = {
    createServerTrustBoundaryHttpRuntime
};
