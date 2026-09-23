"use strict";

const express = require("express");

/**
 * Creates the Server Trust Boundary Express application.
 *
 * This layer is intentionally thin:
 * - no Supabase access
 * - no authentication decisions
 * - no facility determination
 * - no resident matching
 * - no credential logging
 */
function createServerTrustBoundaryApp({
    transport,
    endpointPath = "/connector/ingest",
    sourceDocumentTransport,
    sourceDocumentEndpointPath =
        "/connector/source-documents",
    sourceFieldMappingTransport,
    sourceFieldMappingQueryTransport,
    sourceFieldMappingEndpointPath =
        "/connector/source-field-mappings",
    sourceFieldInterpretationTransport,
    sourceFieldInterpretationQueryTransport,
    sourceFieldInterpretationEndpointPath =
        "/connector/source-field-interpretations",
    connectorResidentCandidateTransport,
    connectorResidentCandidateEndpointPath =
        "/connector/resident-candidates",
    sourceResidentLinkTransport,
    sourceResidentLinkQueryTransport,
    sourceResidentLinkEndpointPath =
        "/connector/source-resident-links",
    sourceResidentMappingTransport,
    sourceResidentMappingQueryTransport,
    sourceResidentMappingEndpointPath =
        "/connector/source-resident-mappings",
    sourceRecordIdentityMappingTransport,
    sourceRecordIdentityMappingQueryTransport,
    sourceRecordIdentityMappingEndpointPath =
        "/connector/source-record-identity-mapping",
    confirmedDocumentTypeTransport,
    confirmedDocumentTypeQueryTransport,
    confirmedDocumentTypeEndpointPath =
        "/connector/confirmed-document-type",
    residentAdmissionDecisionTransport,
    residentAdmissionDecisionQueryTransport,
    residentAdmissionDecisionEndpointPath =
        "/connector/resident-admission-decisions",
    connectorSemanticRecordPreviewTransport,
    connectorSemanticRecordPreviewEndpointPath =
        "/connector/semantic-record-preview",
    connectorSemanticLogicalRecordTransport,
    connectorSemanticLogicalRecordEndpointPath =
        "/connector/semantic-logical-record",
    connectorSemanticLogicalRecordPersistenceTransport,
    connectorSemanticLogicalRecordPersistenceEndpointPath =
        "/connector/semantic-logical-record-persistence",
    connectorSupportRecordBatchWriteTransport,
    connectorSupportRecordBatchWriteEndpointPath =
        "/connector/support-record-batch-write",
    residentCreationTransport,
    residentCreationEndpointPath =
        "/connector/residents",
    connectorResidentAdmissionTransport,
    connectorResidentAdmissionEndpointPath =
        "/connector/resident-admission",
    jsonBodyLimit = "100kb",
    sourceDocumentJsonBodyLimit =
        jsonBodyLimit
} = {}) {
    if (
        !transport ||
        typeof transport.handle !== "function" ||
        typeof transport.createErrorResponse !== "function"
    ) {
        throw new Error(
            "createServerTrustBoundaryApp requires transport"
        );
    }

    const app =
        express();

    app.disable("x-powered-by");

    const defaultJsonParser =
        express.json({
            strict: true,
            limit: jsonBodyLimit
        });

    const sourceDocumentJsonParser =
        express.json({
            strict: true,
            limit:
                sourceDocumentJsonBodyLimit
        });

    app.use(
        (req, res, next) => {
            if (
                sourceDocumentTransport &&
                req.path ===
                    sourceDocumentEndpointPath
            ) {
                return next();
            }

            return defaultJsonParser(
                req,
                res,
                next
            );
        }
    );

    app.all(
        endpointPath,
        async (req, res, next) => {
            try {
                const result =
                    await transport.handle({
                        method:
                            req.method,
                        contentType:
                            req.get("content-type"),
                        headers:
                            req.headers,
                        body:
                            req.body
                    });

                return res
                    .status(result.httpStatus)
                    .json(result.body);
            } catch (error) {
                return next(error);
            }
        }
    );

    if (sourceDocumentTransport) {
        if (
            typeof sourceDocumentTransport.handle !== "function" ||
            typeof sourceDocumentTransport.createErrorResponse !== "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceDocumentTransport"
            );
        }

        app.all(
            sourceDocumentEndpointPath,
            sourceDocumentJsonParser,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceDocumentTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (sourceFieldMappingTransport) {
        if (
            typeof sourceFieldMappingTransport.handle !== "function" ||
            typeof sourceFieldMappingTransport.createErrorResponse !== "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceFieldMappingTransport"
            );
        }

        if (
            sourceFieldMappingQueryTransport &&
            (
                typeof sourceFieldMappingQueryTransport.handle !== "function" ||
                typeof sourceFieldMappingQueryTransport.createErrorResponse !== "function"
            )
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceFieldMappingQueryTransport"
            );
        }

        app.post(
            sourceFieldMappingEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceFieldMappingTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );

        if (sourceFieldMappingQueryTransport) {
            app.get(
                sourceFieldMappingEndpointPath,
                async (req, res, next) => {
                    try {
                        const result =
                            await sourceFieldMappingQueryTransport.handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                        return res
                            .status(result.httpStatus)
                            .json(result.body);
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        }
    }

    if (sourceFieldInterpretationTransport) {
        if (
            typeof sourceFieldInterpretationTransport.handle !== "function" ||
            typeof sourceFieldInterpretationTransport.createErrorResponse !== "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceFieldInterpretationTransport"
            );
        }

        if (
            sourceFieldInterpretationQueryTransport &&
            (
                typeof sourceFieldInterpretationQueryTransport.handle !== "function" ||
                typeof sourceFieldInterpretationQueryTransport.createErrorResponse !== "function"
            )
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceFieldInterpretationQueryTransport"
            );
        }

        app.post(
            sourceFieldInterpretationEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceFieldInterpretationTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );

        if (sourceFieldInterpretationQueryTransport) {
            app.get(
                sourceFieldInterpretationEndpointPath,
                async (req, res, next) => {
                    try {
                        const result =
                            await sourceFieldInterpretationQueryTransport.handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                        return res
                            .status(result.httpStatus)
                            .json(result.body);
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        }
    }

    if (connectorResidentCandidateTransport) {
        if (
            typeof connectorResidentCandidateTransport.handle !==
                "function" ||
            typeof connectorResidentCandidateTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete connectorResidentCandidateTransport"
            );
        }

        app.all(
            connectorResidentCandidateEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorResidentCandidateTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (sourceResidentLinkTransport) {
        if (
            typeof sourceResidentLinkTransport.handle !==
                "function" ||
            typeof sourceResidentLinkTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceResidentLinkTransport"
            );
        }

        if (
            sourceResidentLinkQueryTransport &&
            (
                typeof sourceResidentLinkQueryTransport.handle !==
                    "function" ||
                typeof sourceResidentLinkQueryTransport.createErrorResponse !==
                    "function"
            )
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceResidentLinkQueryTransport"
            );
        }

        app.post(
            sourceResidentLinkEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceResidentLinkTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );

        if (sourceResidentLinkQueryTransport) {
            app.get(
                sourceResidentLinkEndpointPath,
                async (req, res, next) => {
                    try {
                        const result =
                            await sourceResidentLinkQueryTransport.handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                        return res
                            .status(result.httpStatus)
                            .json(result.body);
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        }
    }

    if (sourceResidentMappingTransport) {
        if (
            typeof sourceResidentMappingTransport.handle !==
                "function" ||
            typeof sourceResidentMappingTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceResidentMappingTransport"
            );
        }

        if (
            sourceResidentMappingQueryTransport &&
            (
                typeof sourceResidentMappingQueryTransport.handle !==
                    "function" ||
                typeof sourceResidentMappingQueryTransport.createErrorResponse !==
                    "function"
            )
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceResidentMappingQueryTransport"
            );
        }

        app.post(
            sourceResidentMappingEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceResidentMappingTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );

        if (sourceResidentMappingQueryTransport) {
            app.get(
                sourceResidentMappingEndpointPath,
                async (req, res, next) => {
                    try {
                        const result =
                            await sourceResidentMappingQueryTransport.handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                        return res
                            .status(result.httpStatus)
                            .json(result.body);
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        }
    }

    if (sourceRecordIdentityMappingTransport) {
        if (
            typeof sourceRecordIdentityMappingTransport.handle !==
                "function" ||
            typeof sourceRecordIdentityMappingTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceRecordIdentityMappingTransport"
            );
        }

        if (
            sourceRecordIdentityMappingQueryTransport &&
            (
                typeof sourceRecordIdentityMappingQueryTransport.handle !==
                    "function" ||
                typeof sourceRecordIdentityMappingQueryTransport.createErrorResponse !==
                    "function"
            )
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceRecordIdentityMappingQueryTransport"
            );
        }

        app.post(
            sourceRecordIdentityMappingEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceRecordIdentityMappingTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );

        if (sourceRecordIdentityMappingQueryTransport) {
            app.get(
                sourceRecordIdentityMappingEndpointPath,
                async (req, res, next) => {
                    try {
                        const result =
                            await sourceRecordIdentityMappingQueryTransport.handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                        return res
                            .status(result.httpStatus)
                            .json(result.body);
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        }
    }

    if (confirmedDocumentTypeTransport) {
        if (
            typeof confirmedDocumentTypeTransport.handle !==
                "function" ||
            typeof confirmedDocumentTypeTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete confirmedDocumentTypeTransport"
            );
        }

        if (
            confirmedDocumentTypeQueryTransport &&
            (
                typeof confirmedDocumentTypeQueryTransport.handle !==
                    "function" ||
                typeof confirmedDocumentTypeQueryTransport.createErrorResponse !==
                    "function"
            )
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete confirmedDocumentTypeQueryTransport"
            );
        }

        app.post(
            confirmedDocumentTypeEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await confirmedDocumentTypeTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );

        if (confirmedDocumentTypeQueryTransport) {
            app.get(
                confirmedDocumentTypeEndpointPath,
                async (req, res, next) => {
                    try {
                        const result =
                            await confirmedDocumentTypeQueryTransport.handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                        return res
                            .status(result.httpStatus)
                            .json(result.body);
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        }
    }

    if (residentAdmissionDecisionTransport) {
        if (
            typeof residentAdmissionDecisionTransport.handle !==
                "function" ||
            typeof residentAdmissionDecisionTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete residentAdmissionDecisionTransport"
            );
        }

        if (
            residentAdmissionDecisionQueryTransport &&
            (
                typeof residentAdmissionDecisionQueryTransport.handle !==
                    "function" ||
                typeof residentAdmissionDecisionQueryTransport.createErrorResponse !==
                    "function"
            )
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete residentAdmissionDecisionQueryTransport"
            );
        }

        app.post(
            residentAdmissionDecisionEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await residentAdmissionDecisionTransport.handle({
                            method: req.method,
                            contentType: req.get("content-type"),
                            headers: req.headers,
                            body: req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );

        if (residentAdmissionDecisionQueryTransport) {
            app.get(
                residentAdmissionDecisionEndpointPath,
                async (req, res, next) => {
                    try {
                        const result =
                            await residentAdmissionDecisionQueryTransport.handle({
                                method: req.method,
                                headers: req.headers,
                                query: req.query
                            });

                        return res
                            .status(result.httpStatus)
                            .json(result.body);
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        }
    }

    if (connectorSemanticRecordPreviewTransport) {
        if (
            typeof connectorSemanticRecordPreviewTransport.handle !==
                "function" ||
            typeof connectorSemanticRecordPreviewTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete connectorSemanticRecordPreviewTransport"
            );
        }

        app.post(
            connectorSemanticRecordPreviewEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorSemanticRecordPreviewTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (connectorSemanticLogicalRecordTransport) {
        app.post(
            connectorSemanticLogicalRecordEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorSemanticLogicalRecordTransport.handle({
                            method: req.method,
                            contentType: req.get("content-type"),
                            headers: req.headers,
                            body: req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (connectorResidentAdmissionTransport) {
        if (
            typeof connectorResidentAdmissionTransport.handle !==
                "function" ||
            typeof connectorResidentAdmissionTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete connectorResidentAdmissionTransport"
            );
        }

        app.post(
            connectorResidentAdmissionEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorResidentAdmissionTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (connectorSemanticLogicalRecordPersistenceTransport) {
        app.post(
            connectorSemanticLogicalRecordPersistenceEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorSemanticLogicalRecordPersistenceTransport.handle({
                            method: req.method,
                            contentType: req.get("content-type"),
                            headers: req.headers,
                            body: req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (connectorSupportRecordBatchWriteTransport) {
        if (
            typeof connectorSupportRecordBatchWriteTransport.handle !==
                "function" ||
            typeof connectorSupportRecordBatchWriteTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete connectorSupportRecordBatchWriteTransport"
            );
        }

        app.post(
            connectorSupportRecordBatchWriteEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorSupportRecordBatchWriteTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (residentCreationTransport) {
        if (
            typeof residentCreationTransport.handle !==
                "function" ||
            typeof residentCreationTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete residentCreationTransport"
            );
        }

        app.post(
            residentCreationEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await residentCreationTransport.handle({
                            method:
                                req.method,
                            contentType:
                                req.get("content-type"),
                            headers:
                                req.headers,
                            body:
                                req.body
                        });

                    return res
                        .status(result.httpStatus)
                        .json(result.body);
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    app.use(
        (
            error,
            req,
            res,
            next
        ) => {
            if (
                error &&
                error.type === "entity.too.large"
            ) {
                const result =
                    transport.createErrorResponse({
                        httpStatus: 413,
                        errorCode:
                            "payload_too_large"
                    });

                return res
                    .status(result.httpStatus)
                    .json(result.body);
            }

            if (
                error instanceof SyntaxError &&
                error.status === 400
            ) {
                const result =
                    transport.createErrorResponse({
                        httpStatus: 400,
                        errorCode:
                            "malformed_json"
                    });

                return res
                    .status(result.httpStatus)
                    .json(result.body);
            }

            const result =
                transport.createErrorResponse({
                    httpStatus: 503,
                    errorCode:
                        "connector_processing_unavailable"
                });

            return res
                .status(result.httpStatus)
                .json(result.body);
        }
    );

    return app;
}

module.exports = {
    createServerTrustBoundaryApp
};
