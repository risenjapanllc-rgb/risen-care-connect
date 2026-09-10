"use strict";

const crypto = require("crypto");

/**
 * Server Trust Boundary transport boundary.
 *
 * Concrete endpoint, auth scheme and deployment details remain configurable.
 */
class ServerTrustBoundaryTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader = "x-risen-connector-id"
    } = {}) {
        if (
            !httpAdapter ||
            typeof httpAdapter.handle !== "function"
        ) {
            throw new Error(
                "ServerTrustBoundaryTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !== "function"
        ) {
            throw new Error(
                "ServerTrustBoundaryTransport requires credentialTransport"
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
        contentType,
        headers,
        body
    } = {}) {
        const requestId =
            this.createRequestId();

        if (method !== "POST") {
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
            typeof contentType !== "string" ||
            contentType.toLowerCase() !==
                "application/json"
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

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
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

        const envelopeKeys =
            Object.keys(body).sort();

        if (
            envelopeKeys.length !== 2 ||
            envelopeKeys[0] !== "payload" ||
            envelopeKeys[1] !== "semanticRecords" ||
            !body.payload ||
            typeof body.payload !== "object" ||
            Array.isArray(body.payload) ||
            !Array.isArray(body.semanticRecords) ||
            body.semanticRecords.length === 0
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
                    rawConnectorId.trim(),
                credential,
                payload:
                    body.payload,
                semanticRecords:
                    body.semanticRecords
            });

        if (
            result.status === "matched" ||
            result.status === "needs_review" ||
            result.status === "unmatched"
        ) {
            return {
                httpStatus: 200,
                body: result
            };
        }

        if (result.status === "denied") {
            return {
                httpStatus: 401,
                body: result
            };
        }

        if (result.status === "invalid") {
            return {
                httpStatus: 422,
                body: result
            };
        }

        return {
            httpStatus: 503,
            body: result
        };
    }
}

module.exports =
    ServerTrustBoundaryTransport;
