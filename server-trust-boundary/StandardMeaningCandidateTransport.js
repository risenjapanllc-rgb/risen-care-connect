"use strict";

const crypto =
    require("crypto");

class StandardMeaningCandidateTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !httpAdapter ||
            typeof httpAdapter.handle !==
                "function" ||
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "StandardMeaningCandidateTransport requires dependencies"
            );
        }

        this.httpAdapter =
            httpAdapter;

        this.credentialTransport =
            credentialTransport;

        this.connectorIdHeader =
            String(connectorIdHeader)
                .trim()
                .toLowerCase();
    }

    createRequestId() {
        return crypto.randomUUID();
    }

    async handle({
        method,
        contentType,
        headers,
        body,
        query
    } = {}) {
        const requestId =
            this.createRequestId();

        if (
            method !== "POST" &&
            method !== "GET"
        ) {
            return {
                httpStatus: 405,
                body: {
                    requestId,
                    errorCode:
                        "method_not_allowed"
                }
            };
        }

        if (
            method === "POST" &&
            (
                typeof contentType !== "string" ||
                contentType.toLowerCase() !==
                    "application/json"
            )
        ) {
            return {
                httpStatus: 415,
                body: {
                    requestId,
                    errorCode:
                        "unsupported_media_type"
                }
            };
        }

        const normalizedHeaders = {};

        for (
            const [key, value]
            of Object.entries(headers || {})
        ) {
            normalizedHeaders[
                String(key).toLowerCase()
            ] = value;
        }

        const connectorId =
            normalizedHeaders[
                this.connectorIdHeader
            ];

        const credential =
            this.credentialTransport.extract(
                normalizedHeaders.authorization
            );

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim() ||
            !credential
        ) {
            return {
                httpStatus: 401,
                body: {
                    requestId,
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        if (method === "GET") {
            const templateId =
                typeof query?.templateId ===
                    "string"
                    ? query.templateId.trim()
                    : "";

            if (!templateId) {
                return {
                    httpStatus: 422,
                    body: {
                        requestId,
                        errorCode:
                            "standard_meaning_candidate_invalid"
                    }
                };
            }

            if (
                typeof this.httpAdapter
                    .handleQuery !==
                    "function"
            ) {
                return {
                    httpStatus: 503,
                    body: {
                        requestId,
                        errorCode:
                            "connector_processing_unavailable"
                    }
                };
            }

            const result =
                await this.httpAdapter
                    .handleQuery({
                        requestId,

                        connectorId:
                            connectorId.trim(),

                        credential,

                        templateId
                    });

            if (
                !result ||
                typeof result !== "object" ||
                !Number.isInteger(
                    result.statusCode
                ) ||
                !result.body ||
                typeof result.body !==
                    "object"
            ) {
                return {
                    httpStatus: 503,
                    body: {
                        requestId,
                        errorCode:
                            "connector_processing_unavailable"
                    }
                };
            }

            return {
                httpStatus:
                    result.statusCode,

                body:
                    result.body
            };
        }

        const isClarification =
            Boolean(
                body &&
                typeof body === "object" &&
                !Array.isArray(body) &&
                Object.keys(body).length === 1 &&
                body
                    .standardMeaningCandidateClarification &&
                typeof body
                    .standardMeaningCandidateClarification ===
                    "object" &&
                !Array.isArray(
                    body
                        .standardMeaningCandidateClarification
                )
            );

        if (isClarification) {
            if (
                typeof this.httpAdapter
                    .handleClarification !==
                    "function"
            ) {
                return {
                    httpStatus: 503,
                    body: {
                        requestId,
                        errorCode:
                            "connector_processing_unavailable"
                    }
                };
            }

            const clarificationResult =
                await this.httpAdapter
                    .handleClarification({
                        requestId,

                        connectorId:
                            connectorId.trim(),

                        credential,

                        standardMeaningCandidateClarification:
                            body
                                .standardMeaningCandidateClarification
                    });

            if (
                !clarificationResult ||
                typeof clarificationResult !==
                    "object" ||
                !Number.isInteger(
                    clarificationResult
                        .statusCode
                ) ||
                !clarificationResult.body ||
                typeof clarificationResult.body !==
                    "object"
            ) {
                return {
                    httpStatus: 503,
                    body: {
                        requestId,
                        errorCode:
                            "connector_processing_unavailable"
                    }
                };
            }

            return {
                httpStatus:
                    clarificationResult
                        .statusCode,

                body:
                    clarificationResult.body
            };
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== 1 ||
            !body.standardMeaningCandidate ||
            typeof body
                .standardMeaningCandidate !==
                "object" ||
            Array.isArray(
                body.standardMeaningCandidate
            )
        ) {
            return {
                httpStatus: 400,
                body: {
                    requestId,
                    errorCode:
                        "malformed_json"
                }
            };
        }

        const result =
            await this.httpAdapter.handle({
                requestId,

                connectorId:
                    connectorId.trim(),

                credential,

                standardMeaningCandidate:
                    body
                        .standardMeaningCandidate
            });

        if (
            !result ||
            typeof result !== "object" ||
            !Number.isInteger(
                result.statusCode
            ) ||
            !result.body ||
            typeof result.body !== "object"
        ) {
            return {
                httpStatus: 503,
                body: {
                    requestId,
                    errorCode:
                        "connector_processing_unavailable"
                }
            };
        }

        return {
            httpStatus:
                result.statusCode,

            body:
                result.body
        };
    }
}

module.exports =
    StandardMeaningCandidateTransport;
