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
    jsonBodyLimit = "100kb"
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

    app.use(
        express.json({
            strict: true,
            limit: jsonBodyLimit
        })
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
