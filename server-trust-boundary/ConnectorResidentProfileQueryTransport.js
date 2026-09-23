"use strict";

const crypto = require("crypto");

const BODY_KEYS = new Set([
    "sourceDocumentKey",
    "identifierType",
    "identifierDigest",
    "sourceUpdatedAt",
    "sourceSize"
]);

class ConnectorResidentProfileQueryTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader = "x-risen-connector-id"
    } = {}) {
        if (typeof httpAdapter?.handle !== "function") {
            throw new Error(
                "Profile query transport requires httpAdapter"
            );
        }

        if (typeof credentialTransport?.extract !== "function") {
            throw new Error(
                "Profile query transport requires credentialTransport"
            );
        }

        this.httpAdapter = httpAdapter;
        this.credentialTransport = credentialTransport;
        this.connectorIdHeader =
            String(connectorIdHeader).trim().toLowerCase();
    }

    createRequestId() {
        return crypto.randomUUID();
    }

    async handle({ method, contentType, headers, body } = {}) {
        const requestId = this.createRequestId();

        if (method !== "POST") {
            return {
                httpStatus: 405,
                body: { requestId, errorCode: "method_not_allowed" }
            };
        }

        if (
            typeof contentType !== "string" ||
            !/^application\/json(?:\s*;|\s*$)/i.test(contentType)
        ) {
            return {
                httpStatus: 415,
                body: {
                    requestId,
                    errorCode: "unsupported_media_type"
                }
            };
        }

        const normalizedHeaders = {};

        for (const [key, value] of Object.entries(headers || {})) {
            normalizedHeaders[String(key).toLowerCase()] = value;
        }

        const connectorId =
            normalizedHeaders[this.connectorIdHeader];

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
                    errorCode: "connector_trust_denied"
                }
            };
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== BODY_KEYS.size ||
            Object.keys(body).some(key => !BODY_KEYS.has(key)) ||
            typeof body.sourceDocumentKey !== "string" ||
            !body.sourceDocumentKey.trim() ||
            !["name", "user_code"].includes(body.identifierType) ||
            typeof body.identifierDigest !== "string" ||
            !/^[0-9a-f]{64}$/.test(body.identifierDigest) ||
            typeof body.sourceUpdatedAt !== "string" ||
            !body.sourceUpdatedAt.trim() ||
            Number.isNaN(Date.parse(body.sourceUpdatedAt)) ||
            !Number.isSafeInteger(body.sourceSize) ||
            body.sourceSize < 0
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode: "resident_profile_query_invalid"
                }
            };
        }

        let result;

        try {
            result = await this.httpAdapter.handle({
                requestId,
                connectorId: connectorId.trim(),
                credential,
                ...body
            });
        } catch {
            return {
                httpStatus: 503,
                body: {
                    requestId,
                    errorCode: "connector_processing_unavailable"
                }
            };
        }

        if (
            !result ||
            !Number.isInteger(result.statusCode) ||
            result.statusCode < 100 ||
            result.statusCode > 599 ||
            !result.body ||
            typeof result.body !== "object" ||
            Array.isArray(result.body)
        ) {
            return {
                httpStatus: 503,
                body: {
                    requestId,
                    errorCode: "connector_processing_unavailable"
                }
            };
        }

        return {
            httpStatus: result.statusCode,
            body: result.body
        };
    }
}

module.exports = ConnectorResidentProfileQueryTransport;
