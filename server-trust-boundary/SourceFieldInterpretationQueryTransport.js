"use strict";

const crypto = require("crypto");

class SourceFieldInterpretationQueryTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !httpAdapter ||
            typeof httpAdapter.handle !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationQueryTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !== "function"
        ) {
            throw new Error(
                "SourceFieldInterpretationQueryTransport requires credentialTransport"
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

    createErrorResponse({
        httpStatus,
        errorCode
    } = {}) {
        return {
            httpStatus,
            body: {
                requestId:
                    this.createRequestId(),
                errorCode
            }
        };
    }

    async handle({
        method,
        headers,
        query
    } = {}) {
        const requestId =
            this.createRequestId();

        if (method !== "GET") {
            return {
                httpStatus: 405,
                body: {
                    requestId,
                    errorCode:
                        "method_not_allowed"
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

        const rawConnectorId =
            normalizedHeaders[
                this.connectorIdHeader
            ];

        if (
            typeof rawConnectorId !== "string" ||
            !rawConnectorId.trim()
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

        const credential =
            this.credentialTransport.extract(
                normalizedHeaders.authorization
            );

        if (!credential) {
            return {
                httpStatus: 401,
                body: {
                    requestId,
                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        const sourceDocumentKey =
            query &&
            typeof query.sourceDocumentKey === "string"
                ? query.sourceDocumentKey.trim()
                : "";

        const sourceUpdatedAt =
            query &&
            typeof query.sourceUpdatedAt === "string"
                ? query.sourceUpdatedAt.trim()
                : "";

        const sourceSizeText =
            query &&
            typeof query.sourceSize === "string"
                ? query.sourceSize.trim()
                : "";

        const sourceSize =
            /^\d+$/.test(sourceSizeText)
                ? Number(sourceSizeText)
                : Number.NaN;

        if (
            !sourceDocumentKey ||
            !sourceUpdatedAt ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "source_field_interpretation_query_invalid"
                }
            };
        }

        const result =
            await this.httpAdapter.handle({
                requestId,
                connectorId:
                    rawConnectorId.trim(),
                credential,
                sourceDocumentKey,
                sourceUpdatedAt:
                    new Date(
                        sourceUpdatedAt
                    ).toISOString(),
                sourceSize
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
    SourceFieldInterpretationQueryTransport;
