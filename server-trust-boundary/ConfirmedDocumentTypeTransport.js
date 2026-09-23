"use strict";

const crypto = require("crypto");

class ConfirmedDocumentTypeTransport {
    constructor({ httpAdapter, credentialTransport, connectorIdHeader = "x-risen-connector-id" } = {}) {
        if (!httpAdapter || typeof httpAdapter.handle !== "function") {
            throw new Error("ConfirmedDocumentTypeTransport requires httpAdapter");
        }
        if (!credentialTransport || typeof credentialTransport.extract !== "function") {
            throw new Error("ConfirmedDocumentTypeTransport requires credentialTransport");
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

        if (typeof contentType !== "string" || contentType.toLowerCase() !== "application/json") {
            return { httpStatus: 415, body: { requestId, errorCode: "unsupported_media_type" } };
        }

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return { httpStatus: 400, body: { requestId, errorCode: "malformed_json" } };
        }

        const envelopeKeys = Object.keys(body);
        if (
            envelopeKeys.length !== 1 ||
            envelopeKeys[0] !== "confirmation" ||
            !body.confirmation ||
            typeof body.confirmation !== "object" ||
            Array.isArray(body.confirmation)
        ) {
            return { httpStatus: 400, body: { requestId, errorCode: "malformed_json" } };
        }

        const confirmation = body.confirmation;
        const allowedKeys = new Set([
            "sourceDocumentKey",
            "documentType",
            "confirmedAt",
            "sourceUpdatedAt",
            "sourceSize"
        ]);
        const keys = Object.keys(confirmation);

        if (keys.length !== 5 || keys.some(key => !allowedKeys.has(key))) {
            return { httpStatus: 422, body: { requestId, errorCode: "confirmed_document_type_invalid" } };
        }

        const sourceDocumentKey = typeof confirmation.sourceDocumentKey === "string"
            ? confirmation.sourceDocumentKey.trim()
            : "";
        const documentType = typeof confirmation.documentType === "string"
            ? confirmation.documentType.trim()
            : "";
        const confirmedAt = typeof confirmation.confirmedAt === "string"
            ? confirmation.confirmedAt.trim()
            : "";
        const sourceUpdatedAt = typeof confirmation.sourceUpdatedAt === "string"
            ? confirmation.sourceUpdatedAt.trim()
            : "";
        const sourceSize = confirmation.sourceSize;

        if (
            !sourceDocumentKey ||
            !documentType ||
            !confirmedAt ||
            Number.isNaN(Date.parse(confirmedAt)) ||
            !sourceUpdatedAt ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return { httpStatus: 422, body: { requestId, errorCode: "confirmed_document_type_invalid" } };
        }

        const normalizedHeaders = {};
        for (const [key, value] of Object.entries(headers || {})) {
            normalizedHeaders[String(key).toLowerCase()] = value;
        }

        const rawConnectorId = normalizedHeaders[this.connectorIdHeader];
        if (typeof rawConnectorId !== "string" || !rawConnectorId.trim()) {
            return { httpStatus: 401, body: { requestId, errorCode: "connector_trust_denied" } };
        }

        const credential = this.credentialTransport.extract(normalizedHeaders.authorization);
        if (!credential) {
            return { httpStatus: 401, body: { requestId, errorCode: "connector_trust_denied" } };
        }

        const result = await this.httpAdapter.handle({
            requestId,
            connectorId: rawConnectorId.trim(),
            credential,
            confirmation: {
                sourceDocumentKey,
                documentType,
                confirmedAt: new Date(confirmedAt).toISOString(),
                sourceUpdatedAt: new Date(sourceUpdatedAt).toISOString(),
                sourceSize
            }
        });

        if (
            !result ||
            typeof result !== "object" ||
            !Number.isInteger(result.statusCode) ||
            !result.body ||
            typeof result.body !== "object"
        ) {
            return { httpStatus: 503, body: { requestId, errorCode: "connector_processing_unavailable" } };
        }

        return { httpStatus: result.statusCode, body: result.body };
    }
}

module.exports = ConfirmedDocumentTypeTransport;
