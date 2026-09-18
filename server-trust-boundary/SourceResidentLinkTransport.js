"use strict";

const crypto = require("crypto");

class SourceResidentLinkTransport {
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
                "SourceResidentLinkTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "SourceResidentLinkTransport requires credentialTransport"
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
                "sourceResidentLink" ||
            !body.sourceResidentLink ||
            typeof body.sourceResidentLink !==
                "object" ||
            Array.isArray(
                body.sourceResidentLink
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

        const link =
            body.sourceResidentLink;

        const allowedKeys =
            new Set([
                "sourceDocumentKey",
                "sourceEntityKey",
                "linkStatus",
                "residentId",
                "sourceUpdatedAt",
                "sourceSize"
            ]);

        const linkKeys =
            Object.keys(link);

        if (
            linkKeys.length !== 6 ||
            linkKeys.some(
                key => !allowedKeys.has(key)
            )
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "source_resident_link_invalid"
                }
            };
        }

        const sourceDocumentKey =
            typeof link.sourceDocumentKey ===
                "string"
                ? link.sourceDocumentKey.trim()
                : "";

        const sourceEntityKey =
            typeof link.sourceEntityKey ===
                "string"
                ? link.sourceEntityKey.trim()
                : "";

        const linkStatus =
            typeof link.linkStatus === "string"
                ? link.linkStatus.trim()
                : "";

        const sourceUpdatedAt =
            typeof link.sourceUpdatedAt ===
                "string"
                ? link.sourceUpdatedAt.trim()
                : "";

        const sourceSize =
            link.sourceSize;

        const residentId =
            typeof link.residentId === "string"
                ? link.residentId.trim()
                : link.residentId;

        const validStatuses =
            new Set([
                "confirmed",
                "deferred",
                "no_match"
            ]);

        if (
            !sourceDocumentKey ||
            !sourceEntityKey ||
            !validStatuses.has(linkStatus) ||
            !sourceUpdatedAt ||
            Number.isNaN(
                Date.parse(sourceUpdatedAt)
            ) ||
            !Number.isSafeInteger(sourceSize) ||
            sourceSize < 0 ||
            (
                linkStatus === "confirmed" &&
                (
                    typeof residentId !== "string" ||
                    !residentId
                )
            ) ||
            (
                linkStatus !== "confirmed" &&
                residentId != null
            )
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "source_resident_link_invalid"
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
                sourceResidentLink: {
                    sourceDocumentKey,
                    sourceEntityKey,
                    linkStatus,
                    residentId:
                        linkStatus === "confirmed"
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
    SourceResidentLinkTransport;
