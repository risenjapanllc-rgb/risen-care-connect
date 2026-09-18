"use strict";

const crypto = require("crypto");

class ConnectorSupportRecordBatchWriteTransport {
    constructor({
        httpAdapter,
        credentialTransport,
        connectorIdHeader = "x-risen-connector-id",
        maxBatchSize = 100
    } = {}) {
        if (!httpAdapter || typeof httpAdapter.handle !== "function") {
            throw new Error("ConnectorSupportRecordBatchWriteTransport requires httpAdapter");
        }
        if (!credentialTransport || typeof credentialTransport.extract !== "function") {
            throw new Error("ConnectorSupportRecordBatchWriteTransport requires credentialTransport");
        }
        if (!Number.isInteger(maxBatchSize) || maxBatchSize < 1 || maxBatchSize > 500) {
            throw new Error("ConnectorSupportRecordBatchWriteTransport requires valid maxBatchSize");
        }

        this.httpAdapter = httpAdapter;
        this.credentialTransport = credentialTransport;
        this.connectorIdHeader = String(connectorIdHeader).trim().toLowerCase();
        this.maxBatchSize = maxBatchSize;
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

    async handle({ method, headers, contentType, body } = {}) {
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

        const rawConnectorId = normalizedHeaders[this.connectorIdHeader];
        const credential = this.credentialTransport.extract(
            normalizedHeaders.authorization
        );

        if (
            typeof rawConnectorId !== "string" ||
            !rawConnectorId.trim() ||
            !credential
        ) {
            return {
                httpStatus: 401,
                body: { requestId, errorCode: "connector_trust_denied" }
            };
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== 1 ||
            !Object.prototype.hasOwnProperty.call(body, "operations") ||
            !Array.isArray(body.operations) ||
            body.operations.length < 1 ||
            body.operations.length > this.maxBatchSize ||
            body.operations.some(operation =>
                !operation ||
                typeof operation !== "object" ||
                Array.isArray(operation)
            )
        ) {
            return {
                httpStatus: 422,
                body: { requestId, errorCode: "support_record_batch_write_invalid" }
            };
        }

        const result = await this.httpAdapter.handle({
            requestId,
            connectorId: rawConnectorId.trim(),
            credential,
            operations: body.operations
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

module.exports = ConnectorSupportRecordBatchWriteTransport;
