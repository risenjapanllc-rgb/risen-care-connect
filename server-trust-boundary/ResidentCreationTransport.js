"use strict";

const crypto = require("crypto");

class ResidentCreationTransport {
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
                "ResidentCreationTransport requires httpAdapter"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !== "function"
        ) {
            throw new Error(
                "ResidentCreationTransport requires credentialTransport"
            );
        }

        this.httpAdapter = httpAdapter;
        this.credentialTransport = credentialTransport;
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
                requestId: this.createRequestId(),
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
                    errorCode: "method_not_allowed"
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
                    errorCode: "unsupported_media_type"
                }
            };
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body) ||
            Object.keys(body).length !== 1 ||
            !Object.prototype.hasOwnProperty.call(
                body,
                "resident"
            ) ||
            !body.resident ||
            typeof body.resident !== "object" ||
            Array.isArray(body.resident)
        ) {
            return {
                httpStatus: 400,
                body: {
                    requestId,
                    errorCode: "malformed_json"
                }
            };
        }

        const resident = body.resident;
        const residentKeys =
            Object.keys(resident);

        if (
            residentKeys.length !== 1 ||
            residentKeys[0] !== "name"
        ) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "resident_creation_invalid"
                }
            };
        }

        const name =
            typeof resident.name === "string"
                ? resident.name.trim()
                : "";

        if (!name) {
            return {
                httpStatus: 422,
                body: {
                    requestId,
                    errorCode:
                        "resident_creation_invalid"
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
                resident: {
                    name
                }
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
                body: {
                    requestId,
                    errorCode:
                        "connector_processing_unavailable"
                }
            };
        }

        return {
            httpStatus: result.statusCode,
            body: result.body
        };
    }
}

module.exports = ResidentCreationTransport;
