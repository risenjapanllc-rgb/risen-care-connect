"use strict";

const crypto = require("crypto");

class SourceResidentMappingQueryTransport {
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
                "SourceResidentMappingQueryTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "SourceResidentMappingQueryTransport requires credentialTransport"
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

        const queryKeys =
            query &&
            typeof query === "object" &&
            !Array.isArray(query)
                ? Object.keys(query)
                : [];

        const allowedQueryKeys =
            new Set([
                "sourceDocumentKey",
                "sourceUpdatedAt",
                "sourceSize"
            ]);

        if (
            queryKeys.length !== 3 ||
            queryKeys.some(
                key =>
                    !allowedQueryKeys.has(key)
            )
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "source_resident_mapping_query_invalid"
                }
            };
        }

        const sourceDocumentKey =
            typeof query.sourceDocumentKey ===
                "string"
                ? query.sourceDocumentKey.trim()
                : "";

        const sourceUpdatedAt =
            typeof query.sourceUpdatedAt ===
                "string"
                ? query.sourceUpdatedAt.trim()
                : "";

        const rawSourceSize =
            typeof query.sourceSize === "string"
                ? query.sourceSize.trim()
                : "";

        const sourceSize =
            /^\d+$/.test(rawSourceSize)
                ? Number(rawSourceSize)
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
                        "source_resident_mapping_query_invalid"
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
                    new Date(sourceUpdatedAt)
                        .toISOString(),
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
    SourceResidentMappingQueryTransport;
