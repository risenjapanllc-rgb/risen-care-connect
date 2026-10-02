"use strict";

const crypto = require("crypto");

class VoiceClientTokenTransport {
    constructor({
        tokenService,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !tokenService ||
            typeof tokenService.issue !==
                "function"
        ) {
            throw new Error(
                "VoiceClientTokenTransport requires tokenService"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "VoiceClientTokenTransport requires credentialTransport"
            );
        }

        this.tokenService =
            tokenService;

        this.credentialTransport =
            credentialTransport;

        this.connectorIdHeader =
            String(
                connectorIdHeader
            )
                .trim()
                .toLowerCase();
    }

    createRequestId() {
        return crypto.randomUUID();
    }

    createErrorResponse({
        httpStatus,
        errorCode,
        requestId
    } = {}) {
        return {
            httpStatus,
            body: {
                requestId:
                    requestId ||
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
            return this.createErrorResponse({
                httpStatus: 405,
                errorCode:
                    "method_not_allowed",
                requestId
            });
        }

        if (
            typeof contentType !==
                "string" ||
            contentType.toLowerCase() !==
                "application/json"
        ) {
            return this.createErrorResponse({
                httpStatus: 415,
                errorCode:
                    "unsupported_media_type",
                requestId
            });
        }

        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
        ) {
            return this.createErrorResponse({
                httpStatus: 400,
                errorCode:
                    "malformed_json",
                requestId
            });
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

        const connectorId =
            normalizedHeaders[
                this.connectorIdHeader
            ];

        if (
            typeof connectorId !==
                "string" ||
            !connectorId.trim()
        ) {
            return this.createErrorResponse({
                httpStatus: 401,
                errorCode:
                    "connector_trust_denied",
                requestId
            });
        }

        const credential =
            this.credentialTransport.extract(
                normalizedHeaders.authorization
            );

        if (!credential) {
            return this.createErrorResponse({
                httpStatus: 401,
                errorCode:
                    "connector_trust_denied",
                requestId
            });
        }

        const allowedKeys = [
            "caseId",
            "contactId"
        ];

        for (
            const key of Object.keys(body)
        ) {
            if (
                !allowedKeys.includes(key)
            ) {
                return this.createErrorResponse({
                    httpStatus: 400,
                    errorCode:
                        "malformed_json",
                    requestId
                });
            }
        }

        let result;

        try {
            result =
                await this.tokenService.issue({
                    connectorId:
                        connectorId.trim(),

                    credential,

                    caseId:
                        body.caseId,

                    contactId:
                        body.contactId
                });
        } catch (error) {
            return this.createErrorResponse({
                httpStatus: 503,
                errorCode:
                    "voice_token_processing_unavailable",
                requestId
            });
        }

        if (
            result?.status ===
            "issued"
        ) {
            return {
                httpStatus: 200,

                body: {
                    requestId,

                    status:
                        "issued",

                    token:
                        result.token,

                    intentId:
                        result.intentId,

                    expiresIn:
                        result.expiresIn
                }
            };
        }

        if (
            result?.status ===
            "denied"
        ) {
            return this.createErrorResponse({
                httpStatus: 401,
                errorCode:
                    "connector_trust_denied",
                requestId
            });
        }

        if (
            result?.status ===
            "invalid"
        ) {
            return this.createErrorResponse({
                httpStatus: 422,
                errorCode:
                    result.errorCode ||
                    "voice_token_request_invalid",
                requestId
            });
        }

        return this.createErrorResponse({
            httpStatus: 503,
            errorCode:
                result &&
                typeof result.errorCode === "string" &&
                result.errorCode
                    ? result.errorCode
                    : "voice_token_processing_unavailable",
            requestId
        });
    }
}

module.exports =
    VoiceClientTokenTransport;
