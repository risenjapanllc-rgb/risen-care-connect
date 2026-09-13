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

const SourceFieldInterpretationHttpAdapter =
    require("./SourceFieldInterpretationHttpAdapter");

const SourceFieldInterpretationTransport =
    require("./SourceFieldInterpretationTransport");

const SourceFieldInterpretationQueryHttpAdapter =
    require("./SourceFieldInterpretationQueryHttpAdapter");

const SourceFieldInterpretationQueryTransport =
    require("./SourceFieldInterpretationQueryTransport");


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

    const app =
        createServerTrustBoundaryApp({
            transport,
            endpointPath,
            sourceDocumentTransport,
            sourceDocumentEndpointPath:
                "/connector/source-documents",
            sourceFieldMappingTransport,
            sourceFieldMappingEndpointPath:
                "/connector/source-field-mappings",
            sourceFieldInterpretationTransport,
            sourceFieldInterpretationQueryTransport,
            sourceFieldInterpretationEndpointPath:
                "/connector/source-field-interpretations",
            jsonBodyLimit
        });

    return {
        app
    };
}

module.exports = {
    createServerTrustBoundaryHttpRuntime
};
