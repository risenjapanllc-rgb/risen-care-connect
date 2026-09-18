"use strict";

const crypto = require("crypto");

class SourceRecordIdentityMappingTransport {
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
                "SourceRecordIdentityMappingTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "SourceRecordIdentityMappingTransport requires credentialTransport"
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

        const envelopeKeys =
            Object.keys(body);

        if (
            envelopeKeys.length !== 1 ||
            envelopeKeys[0] !==
                "sourceRecordIdentityMapping" ||
            !body.sourceRecordIdentityMapping ||
            typeof body.sourceRecordIdentityMapping !==
                "object" ||
            Array.isArray(
                body.sourceRecordIdentityMapping
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

        const mapping =
            body.sourceRecordIdentityMapping;

        const allowedKeys =
            new Set([
                "sourceDocumentKey",
                "sourceFieldKey",
                "sheetName",
                "headerLabel",
                "confirmedAt",
                "sourceUpdatedAt",
                "sourceSize"
            ]);

        const mappingKeys =
            Object.keys(mapping);

        if (
            mappingKeys.length !== 7 ||
            mappingKeys.some(
                key => !allowedKeys.has(key)
            )
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "source_record_identity_mapping_invalid"
                }
            };
        }

        const sourceDocumentKey =
            typeof mapping.sourceDocumentKey === "string"
                ? mapping.sourceDocumentKey.trim()
                : "";

        const sourceFieldKey =
            typeof mapping.sourceFieldKey === "string"
                ? mapping.sourceFieldKey.trim()
                : "";

        const sheetName =
            typeof mapping.sheetName === "string"
                ? mapping.sheetName
                : mapping.sheetName;

        const headerLabel =
            typeof mapping.headerLabel === "string"
                ? mapping.headerLabel
                : mapping.headerLabel;

        const confirmedAt =
            typeof mapping.confirmedAt === "string"
                ? mapping.confirmedAt.trim()
                : "";

        const sourceUpdatedAt =
            typeof mapping.sourceUpdatedAt === "string"
                ? mapping.sourceUpdatedAt.trim()
                : "";

        const sourceSize =
            mapping.sourceSize;

        if (
            !sourceDocumentKey ||
            !sourceFieldKey ||
            (
                sheetName !== null &&
                typeof sheetName !== "string"
            ) ||
            (
                headerLabel !== null &&
                typeof headerLabel !== "string"
            ) ||
            !confirmedAt ||
            Number.isNaN(Date.parse(confirmedAt)) ||
            !sourceUpdatedAt ||
            Number.isNaN(Date.parse(sourceUpdatedAt)) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "source_record_identity_mapping_invalid"
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

        const result =
            await this.httpAdapter.handle({
                requestId,
                connectorId:
                    rawConnectorId.trim(),
                credential,
                sourceRecordIdentityMapping: {
                    sourceDocumentKey,
                    sourceFieldKey,
                    sheetName,
                    headerLabel,
                    confirmedAt:
                        new Date(confirmedAt)
                            .toISOString(),
                    sourceUpdatedAt:
                        new Date(sourceUpdatedAt)
                            .toISOString(),
                    sourceSize
                }
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
    SourceRecordIdentityMappingTransport;
