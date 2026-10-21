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
    connectorActivationTransport,
    connectorActivationEndpointPath =
        "/connector/activate",
    sourceDocumentTransport,
    sourceDocumentEndpointPath =
        "/connector/source-documents",
    sourceFieldMappingTransport,
    sourceFieldMappingQueryTransport,
    sourceFieldMappingEndpointPath =
        "/connector/source-field-mappings",
    sourceTemplateExactTransport,
    sourceTemplateExactEndpointPath =
        "/connector/source-templates/exact",
    sourceTemplateFieldsTransport,
    sourceTemplateFieldsEndpointPath =
        "/connector/source-template-fields/exact",
    wordSourceTemplateReviewedTransport,
    wordSourceTemplateReviewedEndpointPath =
        "/connector/source-templates/word-reviewed",
    sourceTemplateSemanticAuthorityTransport,
    sourceTemplateSemanticAuthorityEndpointPath =
        "/connector/source-template-semantic-authority",
    standardMeaningCandidateTransport,
    standardMeaningCandidateEndpointPath =
        "/connector/standard-meaning-candidate",
    documentSemanticTargetTransport,
    documentSemanticTargetEndpointPath =
        "/connector/document-semantic-targets",
    semanticProjectionContractTransport,
    semanticProjectionContractEndpointPath =
        "/connector/semantic-projection-contracts",
    sourceDocumentTemplateBindingTransport,
    sourceDocumentTemplateBindingQueryTransport,
    sourceDocumentTemplateBindingEndpointPath =
        "/connector/source-document-template-bindings",
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
    logicalSourceResidentAssociationTransport,
    logicalSourceResidentAssociationEndpointPath =
        "/connector/logical-source-resident-associations",
    logicalSourceSemanticTransport,
    logicalSourceSemanticEndpointPath =
        "/connector/logical-source-semantic-records",
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
    recipientCertificateAtomicPersistenceTransport,
    recipientCertificateAtomicPersistenceEndpointPath =
        "/connector/recipient-certificate-atomic-persistence",
    connectorSupportRecordBatchWriteTransport,
    connectorSupportRecordBatchWriteEndpointPath =
        "/connector/support-record-batch-write",
    residentCreationTransport,
    residentCreationEndpointPath =
        "/connector/residents",
    connectorResidentAdmissionTransport,
    connectorResidentAdmissionEndpointPath =
        "/connector/resident-admission",
    connectorResidentProfileTransport,
    connectorResidentProfileEndpointPath =
        "/connector/resident-profile",
    connectorResidentProfileQueryTransport,
    connectorResidentProfileQueryEndpointPath =
        "/connector/resident-profile-query",
    voiceCallTransport,
    voiceCallEndpointPath =
        "/connector/voice-calls",
    voiceClientTokenTransport,
    voiceClientTokenEndpointPath =
        "/connector/voice-token",
    voiceInboundTokenTransport,
    voiceInboundTokenEndpointPath =
        "/connector/voice-inbound-token",
    voiceAnswerTransport,
    voiceAnswerEndpointPath =
        "/voice/answer",
    voiceEventTransport,
    voiceEventEndpointPath =
        "/voice/event",
    voiceRecordingTransport,
    voiceRecordingEndpointPath =
        "/voice/recording",
    voiceRecordingPlaybackTransport,
    voiceRecordingPlaybackEndpointPath =
        "/connector/voice-recording-playback",
    voiceSemanticAnalysisTransport,
    voiceSemanticAnalysisEndpointPath =
        "/connector/voice-semantic-analysis",
    voiceTranscriptRevisionTransport,
    voiceTranscriptRevisionEndpointPath =
        "/connector/voice-transcript-revise",
    voiceSummaryRegenerationTransport,
    voiceSummaryRegenerationEndpointPath =
        "/connector/voice-summary-regenerate",
    voiceSummaryConfirmationTransport,
    voiceSummaryConfirmationEndpointPath =
        "/connector/voice-summary-confirm",
    diagnosticLogger,
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

    if (sourceTemplateExactTransport) {
        if (
            typeof sourceTemplateExactTransport.handle !==
                "function" ||
            typeof sourceTemplateExactTransport
                .createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete sourceTemplateExactTransport"
            );
        }

        app.post(
            sourceTemplateExactEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceTemplateExactTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (sourceTemplateFieldsTransport) {
        app.post(
            sourceTemplateFieldsEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceTemplateFieldsTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (wordSourceTemplateReviewedTransport) {
        if (
            typeof wordSourceTemplateReviewedTransport
                .handle !== "function" ||
            typeof wordSourceTemplateReviewedTransport
                .createErrorResponse !== "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete wordSourceTemplateReviewedTransport"
            );
        }

        app.post(
            wordSourceTemplateReviewedEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await wordSourceTemplateReviewedTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (sourceTemplateSemanticAuthorityTransport) {
        app.all(
            sourceTemplateSemanticAuthorityEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceTemplateSemanticAuthorityTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body,
                                query:
                                    req.query
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (standardMeaningCandidateTransport) {
        app.all(
            standardMeaningCandidateEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await standardMeaningCandidateTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body,
                                query:
                                    req.query
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (documentSemanticTargetTransport) {
        app.get(
            documentSemanticTargetEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await documentSemanticTargetTransport
                            .handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (semanticProjectionContractTransport) {
        app.get(
            semanticProjectionContractEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await semanticProjectionContractTransport
                            .handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (sourceDocumentTemplateBindingTransport) {
        app.post(
            sourceDocumentTemplateBindingEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceDocumentTemplateBindingTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (sourceDocumentTemplateBindingQueryTransport) {
        app.get(
            sourceDocumentTemplateBindingEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await sourceDocumentTemplateBindingQueryTransport
                            .handle({
                                method:
                                    req.method,
                                headers:
                                    req.headers,
                                query:
                                    req.query
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
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

    if (
        logicalSourceResidentAssociationTransport
    ) {
        if (
            typeof logicalSourceResidentAssociationTransport.handle !==
                "function" ||
            typeof logicalSourceResidentAssociationTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete logicalSourceResidentAssociationTransport"
            );
        }

        app.post(
            logicalSourceResidentAssociationEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await logicalSourceResidentAssociationTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
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

    if (connectorResidentProfileTransport) {
        if (
            typeof connectorResidentProfileTransport.handle !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete connectorResidentProfileTransport"
            );
        }

        app.post(
            connectorResidentProfileEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorResidentProfileTransport.handle({
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

    if (connectorResidentProfileQueryTransport) {
        if (
            typeof connectorResidentProfileQueryTransport.handle !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires connectorResidentProfileQueryTransport"
            );
        }

        app.post(
            connectorResidentProfileQueryEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorResidentProfileQueryTransport.handle({
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

    if (voiceCallTransport) {
        if (
            typeof voiceCallTransport.handle !==
                "function" ||
            typeof voiceCallTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete voiceCallTransport"
            );
        }

        app.all(
            voiceCallEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await voiceCallTransport.handle({
                            method:
                                req.method,

                            contentType:
                                req.get(
                                    "content-type"
                                ),

                            headers:
                                req.headers,

                            body:
                                req.body
                        });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );

                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (voiceClientTokenTransport) {
        if (
            typeof voiceClientTokenTransport.handle !==
                "function" ||
            typeof voiceClientTokenTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete voiceClientTokenTransport"
            );
        }

        app.all(
            voiceClientTokenEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await voiceClientTokenTransport.handle({
                            method:
                                req.method,

                            contentType:
                                req.get(
                                    "content-type"
                                ),

                            headers:
                                req.headers,

                            body:
                                req.body
                        });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (voiceInboundTokenTransport) {
        if (
            typeof voiceInboundTokenTransport.handle !==
                "function" ||
            typeof voiceInboundTokenTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete voiceInboundTokenTransport"
            );
        }

        app.all(
            voiceInboundTokenEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await voiceInboundTokenTransport.handle({
                            method:
                                req.method,

                            contentType:
                                req.get(
                                    "content-type"
                                ),

                            headers:
                                req.headers,

                            body:
                                req.body
                        });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (voiceAnswerTransport) {
        app.all(
            voiceAnswerEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await voiceAnswerTransport.handle({
                            headers:
                                req.headers,

                            query:
                                req.query,

                            body:
                                req.body
                        });

                    console.info(
                        "RISEN VOICE ANSWER DIAGNOSTIC",
                        {
                            method:
                                req.method,

                            regionUrl:
                                req.query?.region_url ||
                                req.body?.region_url ||
                                null,

                            queryKeys:
                                Object.keys(
                                    req.query || {}
                                ).sort(),

                            bodyKeys:
                                (
                                    req.body &&
                                    typeof req.body ===
                                        "object" &&
                                    !Array.isArray(req.body)
                                )
                                    ? Object.keys(
                                        req.body
                                    ).sort()
                                    : [],

                            authorizationPresent:
                                Boolean(
                                    req.headers &&
                                    (
                                        req.headers.authorization ||
                                        req.headers.Authorization
                                    )
                                ),

                            fromPresent:
                                Boolean(
                                    req.query?.from ||
                                    req.body?.from
                                ),

                            toPresent:
                                Boolean(
                                    req.query?.to ||
                                    req.body?.to
                                ),

                            conversationUuidPresent:
                                Boolean(
                                    req.query?.conversation_uuid ||
                                    req.query?.conversationUuid ||
                                    req.body?.conversation_uuid ||
                                    req.body?.conversationUuid
                                ),

                            intentIdPresent:
                                Boolean(
                                    req.query?.intentId ||
                                    req.body?.intentId ||
                                    req.body?.custom_data?.intentId
                                ),

                            httpStatus:
                                result.httpStatus,

                            resultKind:
                                Array.isArray(result.body)
                                    ? String(
                                        result.body[0]?.action ||
                                        "ncco"
                                    )
                                    : String(
                                        result.body?.errorCode ||
                                        "object"
                                    )
                        }
                    );

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (voiceEventTransport) {
        app.post(
            voiceEventEndpointPath,
            async (req, res, next) => {
                try {
                    if (
                        diagnosticLogger &&
                        typeof diagnosticLogger.info ===
                            "function"
                    ) {
                        try {
                            diagnosticLogger.info(
                                "RISEN VOICE EVENT ROUTE DIAGNOSTIC",
                                {
                                    method:
                                        req.method,

                                    authorizationPresent:
                                        Boolean(
                                            req.headers &&
                                            req.headers.authorization
                                        ),

                                    bodyPresent:
                                        Boolean(
                                            req.body &&
                                            typeof req.body ===
                                                "object"
                                        ),

                                    statusPresent:
                                        typeof req.body?.status ===
                                            "string" &&
                                        Boolean(
                                            req.body.status.trim()
                                        ),

                                    detailPresent:
                                        req.body?.detail !==
                                            undefined &&
                                        req.body?.detail !==
                                            null,

                                    sipCodePresent:
                                        req.body?.sip_code !==
                                            undefined &&
                                        req.body?.sip_code !==
                                            null,

                                    uuidPresent:
                                        typeof req.body?.uuid ===
                                            "string" &&
                                        Boolean(
                                            req.body.uuid.trim()
                                        ),

                                    conversationUuidPresent:
                                        typeof req.body
                                            ?.conversation_uuid ===
                                            "string" &&
                                        Boolean(
                                            req.body
                                                .conversation_uuid
                                                .trim()
                                        )
                                }
                            );
                        } catch {
                        }
                    }

                    const result =
                        await voiceEventTransport.handle({
                            headers:
                                req.headers,

                            body:
                                req.body
                        });

                    if (
                        diagnosticLogger &&
                        typeof diagnosticLogger.info ===
                            "function"
                    ) {
                        try {
                            diagnosticLogger.info(
                                "RISEN VOICE EVENT RESULT DIAGNOSTIC",
                                {
                                    status:
                                        typeof req.body?.status ===
                                            "string"
                                            ? req.body.status
                                                .trim()
                                                .toLowerCase()
                                            : null,

                                    httpStatus:
                                        result?.httpStatus ??
                                        null,

                                    errorCode:
                                        typeof result?.body
                                            ?.errorCode ===
                                            "string"
                                            ? result.body
                                                .errorCode
                                            : null,

                                    accepted:
                                        result?.body?.status ===
                                            "accepted"
                                }
                            );
                        } catch {
                        }
                    }

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (voiceRecordingTransport) {
        app.post(
            voiceRecordingEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await voiceRecordingTransport.handle({
                            headers:
                                req.headers,

                            body:
                                req.body
                        });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (voiceRecordingPlaybackTransport) {
        app.all(
            voiceRecordingPlaybackEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await voiceRecordingPlaybackTransport
                            .handle({
                                method:
                                    req.method,

                                contentType:
                                    req.get(
                                        "content-type"
                                    ),

                                headers:
                                    req.headers,

                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    if (voiceSemanticAnalysisTransport) {
        app.all(
            voiceSemanticAnalysisEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await voiceSemanticAnalysisTransport
                            .handle({
                                method:
                                    req.method,

                                contentType:
                                    req.get(
                                        "content-type"
                                    ),

                                headers:
                                    req.headers,

                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(error);
                }
            }
        );
    }

    const registerVoiceCommunicationRevisionRoute =
        (
            routePath,
            routeTransport
        ) => {
            if (!routeTransport) {
                return;
            }

            app.all(
                routePath,
                async (req, res, next) => {
                    try {
                        const result =
                            await routeTransport
                                .handle({
                                    method:
                                        req.method,

                                    contentType:
                                        req.get(
                                            "content-type"
                                        ),

                                    headers:
                                        req.headers,

                                    body:
                                        req.body
                                });

                        return res
                            .status(
                                result.httpStatus
                            )
                            .json(
                                result.body
                            );
                    } catch (error) {
                        return next(error);
                    }
                }
            );
        };

    registerVoiceCommunicationRevisionRoute(
        voiceTranscriptRevisionEndpointPath,
        voiceTranscriptRevisionTransport
    );

    registerVoiceCommunicationRevisionRoute(
        voiceSummaryRegenerationEndpointPath,
        voiceSummaryRegenerationTransport
    );

    registerVoiceCommunicationRevisionRoute(
        voiceSummaryConfirmationEndpointPath,
        voiceSummaryConfirmationTransport
    );

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

    if (recipientCertificateAtomicPersistenceTransport) {
        app.post(
            recipientCertificateAtomicPersistenceEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await recipientCertificateAtomicPersistenceTransport.handle({
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

    if (connectorActivationTransport) {
        if (
            typeof connectorActivationTransport.handle !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete connectorActivationTransport"
            );
        }

        app.all(
            connectorActivationEndpointPath,
            async (req, res, next) => {
                try {
                    const result =
                        await connectorActivationTransport.handle({
                            method:
                                req.method,
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

    if (
        logicalSourceSemanticTransport
    ) {
        if (
            typeof logicalSourceSemanticTransport.handle !==
                "function" ||
            typeof logicalSourceSemanticTransport.createErrorResponse !==
                "function"
        ) {
            throw new Error(
                "createServerTrustBoundaryApp requires complete logicalSourceSemanticTransport"
            );
        }

        app.post(
            logicalSourceSemanticEndpointPath,
            async (
                req,
                res,
                next
            ) => {
                try {
                    const result =
                        await logicalSourceSemanticTransport
                            .handle({
                                method:
                                    req.method,
                                contentType:
                                    req.get(
                                        "content-type"
                                    ),
                                headers:
                                    req.headers,
                                body:
                                    req.body
                            });

                    return res
                        .status(
                            result.httpStatus
                        )
                        .json(
                            result.body
                        );
                } catch (error) {
                    return next(
                        error
                    );
                }
            }
        );
    }


    return app;
}

module.exports = {
    createServerTrustBoundaryApp
};
