"use strict";

const crypto = require("crypto");

class ConnectorResidentAdmissionTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader = "x-risen-connector-id"
    } = {}) {
        if (!httpAdapter || typeof httpAdapter.handle !== "function") {
            throw new Error("ConnectorResidentAdmissionTransport requires httpAdapter");
        }
        if (!credentialTransport || typeof credentialTransport.extract !== "function") {
            throw new Error("ConnectorResidentAdmissionTransport requires credentialTransport");
        }

        this.httpAdapter = httpAdapter;
        this.credentialTransport = credentialTransport;
        this.connectorIdHeader = String(connectorIdHeader).trim().toLowerCase();
    }

    createRequestId() {
        return crypto.randomUUID();
    }

    createErrorResponse({ httpStatus, errorCode } = {}) {
        return {
            httpStatus,
            body: { requestId: this.createRequestId(), errorCode }
        };
    }

    async handle({ method, contentType, headers, body } = {}) {
        const requestId = this.createRequestId();

        if (method !== "POST") {
            return { httpStatus: 405, body: { requestId, errorCode: "method_not_allowed" } };
        }

        if (
            typeof contentType !== "string" ||
            !contentType.toLowerCase().startsWith("application/json")
        ) {
            return { httpStatus: 415, body: { requestId, errorCode: "unsupported_media_type" } };
        }

        const normalizedHeaders = {};
        for (const [key, value] of Object.entries(headers || {})) {
            normalizedHeaders[String(key).toLowerCase()] = value;
        }

        const connectorId = normalizedHeaders[this.connectorIdHeader];
        const credential = this.credentialTransport.extract(
            normalizedHeaders.authorization
        );

        if (
            typeof connectorId !== "string" ||
            !connectorId.trim() ||
            !credential
        ) {
            return {
                httpStatus: 401,
                body: { requestId, errorCode: "connector_trust_denied" }
            };
        }

        const allowedKeys = new Set([
            "sourceDocumentKey",
            "identifierType",
            "identifierDigest",
            "name",
            "sourceUpdatedAt",
            "sourceSize"
        ]);

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== allowedKeys.size ||
            Object.keys(body).some(key => !allowedKeys.has(key))
        ) {
            return {
                httpStatus: 422,
                body: { requestId, errorCode: "resident_admission_invalid" }
            };
        }

        const result = await this.httpAdapter.handle({
            requestId,
            connectorId: connectorId.trim(),
            credential,
            ...body
        });

        if (
            !result ||
            typeof result !== "object" ||
            !Number.isInteger(result.statusCode) ||
            !result.body ||
            typeof result.body !== "object"
        ) {
            return {
                httpStatus: 503,
                body: { requestId, errorCode: "connector_processing_unavailable" }
            };
        }

        return {
            httpStatus: result.statusCode,
            body: result.body
        };
    }
}

module.exports = ConnectorResidentAdmissionTransport;
