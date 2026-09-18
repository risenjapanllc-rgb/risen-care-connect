"use strict";

const crypto = require("crypto");

class ConnectorSemanticRecordPreviewTransport {
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
                "ConnectorSemanticRecordPreviewTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !== "function"
        ) {
            throw new Error(
                "ConnectorSemanticRecordPreviewTransport requires credentialTransport"
            );
        }

        this.httpAdapter = httpAdapter;
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
        contentType,
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
            !contentType
                .toLowerCase()
                .startsWith(
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

        const rawConnectorId =
            normalizedHeaders[
                this.connectorIdHeader
            ];

        const credential =
            this.credentialTransport.extract(
                normalizedHeaders.authorization
            );

        if (
            typeof rawConnectorId !== "string" ||
            !rawConnectorId.trim() ||
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

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== 2 ||
            typeof body.sourceDocumentKey !==
                "string" ||
            !body.sourceDocumentKey.trim() ||
            !Array.isArray(
                body.sourceRecordKeys
            ) ||
            body.sourceRecordKeys.length < 1 ||
            body.sourceRecordKeys.length > 500
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "semantic_record_preview_invalid"
                }
            };
        }

        const allowedKeys =
            new Set([
                "sourceDocumentKey",
                "sourceRecordKeys"
            ]);

        if (
            Object.keys(body).some(
                key => !allowedKeys.has(key)
            )
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "semantic_record_preview_invalid"
                }
            };
        }

        const sourceRecordKeys =
            body.sourceRecordKeys.map(value =>
                typeof value === "string"
                    ? value.trim()
                    : ""
            );

        if (
            sourceRecordKeys.some(value => !value) ||
            new Set(sourceRecordKeys).size !==
                sourceRecordKeys.length
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "semantic_record_preview_invalid"
                }
            };
        }

        const result =
            await this.httpAdapter.handle({
                requestId,
                connectorId:
                    rawConnectorId.trim(),
                credential,
                sourceDocumentKey:
                    body.sourceDocumentKey.trim(),
                sourceRecordKeys
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
    ConnectorSemanticRecordPreviewTransport;
