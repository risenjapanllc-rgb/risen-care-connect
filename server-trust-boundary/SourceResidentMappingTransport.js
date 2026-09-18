"use strict";

const crypto = require("crypto");

class SourceResidentMappingTransport {
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
                "SourceResidentMappingTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "SourceResidentMappingTransport requires credentialTransport"
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
                "sourceResidentMapping" ||
            !body.sourceResidentMapping ||
            typeof body.sourceResidentMapping !==
                "object" ||
            Array.isArray(
                body.sourceResidentMapping
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
            body.sourceResidentMapping;

        const allowedKeys =
            new Set([
                "sourceDocumentKey",
                "identifierType",
                "identifierDigest",
                "mappingStatus",
                "residentId",
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
                        "source_resident_mapping_invalid"
                }
            };
        }

        const sourceDocumentKey =
            typeof mapping.sourceDocumentKey ===
                "string"
                ? mapping.sourceDocumentKey.trim()
                : "";

        const identifierType =
            typeof mapping.identifierType === "string"
                ? mapping.identifierType.trim()
                : "";

        const identifierDigest =
            typeof mapping.identifierDigest ===
                "string"
                ? mapping.identifierDigest.trim()
                : "";

        const mappingStatus =
            typeof mapping.mappingStatus === "string"
                ? mapping.mappingStatus.trim()
                : "";

        const sourceUpdatedAt =
            typeof mapping.sourceUpdatedAt ===
                "string"
                ? mapping.sourceUpdatedAt.trim()
                : "";

        const sourceSize =
            mapping.sourceSize;

        const residentId =
            typeof mapping.residentId === "string"
                ? mapping.residentId.trim()
                : mapping.residentId;

        const normalizedIdentifierType =
            typeof identifierType === "string"
                ? identifierType.trim()
                : "";

        const normalizedIdentifierDigest =
            typeof identifierDigest === "string"
                ? identifierDigest.trim()
                : "";

        const validStatuses =
            new Set([
                "confirmed",
                "deferred",
                "no_match"
            ]);

        if (
            !sourceDocumentKey ||
            !["user_code", "name"].includes(
                normalizedIdentifierType
            ) ||
            !/^[0-9a-f]{64}$/.test(
                normalizedIdentifierDigest
            ) ||
            !validStatuses.has(mappingStatus) ||
            !sourceUpdatedAt ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            (
                mappingStatus === "confirmed" &&
                (
                    typeof residentId !== "string" ||
                    !residentId
                )
            ) ||
            (
                mappingStatus !== "confirmed" &&
                residentId != null
            )
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "source_resident_mapping_invalid"
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
                sourceResidentMapping: {
                    sourceDocumentKey,
                    identifierType:
                        normalizedIdentifierType,
                    identifierDigest:
                        normalizedIdentifierDigest,
                    mappingStatus,
                    residentId:
                        mappingStatus === "confirmed"
                            ? residentId
                            : null,
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
    SourceResidentMappingTransport;
