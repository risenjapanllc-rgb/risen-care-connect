"use strict";

const crypto =
    require("crypto");

const SUPPORTED_OPERATIONS =
    new Set([
        "reviseTranscript",
        "regenerateSummary",
        "confirmSummary"
    ]);

class VoiceCommunicationRevisionTransport {
    constructor({
        revisionService,
        credentialTransport,
        operation,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !revisionService ||
            typeof revisionService !== "object"
        ) {
            throw new Error(
                "VoiceCommunicationRevisionTransport requires revisionService"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "VoiceCommunicationRevisionTransport requires credentialTransport"
            );
        }

        if (
            typeof operation !== "string" ||
            !SUPPORTED_OPERATIONS.has(
                operation
            ) ||
            typeof revisionService[
                operation
            ] !== "function"
        ) {
            throw new Error(
                "VoiceCommunicationRevisionTransport requires supported operation"
            );
        }

        this.revisionService =
            revisionService;

        this.credentialTransport =
            credentialTransport;

        this.operation =
            operation;

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

    allowedKeys() {
        if (
            this.operation ===
            "reviseTranscript"
        ) {
            return new Set([
                "communicationLogId",
                "transcript",
                "revisedByName",
                "revisionReason"
            ]);
        }

        if (
            this.operation ===
            "confirmSummary"
        ) {
            return new Set([
                "communicationLogId",
                "confirmedSummary",
                "revisedByName",
                "revisionReason"
            ]);
        }

        return new Set([
            "communicationLogId"
        ]);
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
                httpStatus:
                    405,

                errorCode:
                    "method_not_allowed",

                requestId
            });
        }

        if (
            typeof contentType !==
                "string" ||
            !contentType
                .toLowerCase()
                .startsWith(
                    "application/json"
                )
        ) {
            return this.createErrorResponse({
                httpStatus:
                    415,

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
                httpStatus:
                    400,

                errorCode:
                    "malformed_json",

                requestId
            });
        }

        const allowedKeys =
            this.allowedKeys();

        for (
            const key of
            Object.keys(body)
        ) {
            if (
                !allowedKeys.has(key)
            ) {
                return this.createErrorResponse({
                    httpStatus:
                        400,

                    errorCode:
                        "malformed_json",

                    requestId
                });
            }
        }

        const normalizedHeaders = {};

        for (
            const [key, value] of
            Object.entries(
                headers || {}
            )
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
                httpStatus:
                    401,

                errorCode:
                    "connector_trust_denied",

                requestId
            });
        }

        const credential =
            this.credentialTransport
                .extract(
                    normalizedHeaders
                        .authorization
                );

        if (!credential) {
            return this.createErrorResponse({
                httpStatus:
                    401,

                errorCode:
                    "connector_trust_denied",

                requestId
            });
        }

        let result;

        try {
            result =
                await this.revisionService[
                    this.operation
                ]({
                    connectorId:
                        connectorId.trim(),

                    credential,

                    ...body
                });
        } catch {
            return this.createErrorResponse({
                httpStatus:
                    503,

                errorCode:
                    "voice_communication_revision_unavailable",

                requestId
            });
        }

        if (
            result?.status ===
            "updated"
        ) {
            return {
                httpStatus:
                    200,

                body: {
                    requestId,

                    status:
                        "updated",

                    state:
                        result.state || null
                }
            };
        }

        if (
            result?.status ===
            "stale"
        ) {
            return this.createErrorResponse({
                httpStatus:
                    409,

                errorCode:
                    result.errorCode ||
                    "voice_communication_revision_stale",

                requestId
            });
        }

        if (
            result?.status ===
            "denied"
        ) {
            return this.createErrorResponse({
                httpStatus:
                    401,

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
                httpStatus:
                    422,

                errorCode:
                    result.errorCode ||
                    "voice_communication_revision_request_invalid",

                requestId
            });
        }

        if (
            result?.status ===
            "not_found"
        ) {
            return this.createErrorResponse({
                httpStatus:
                    404,

                errorCode:
                    result.errorCode ||
                    "voice_communication_not_found",

                requestId
            });
        }

        return this.createErrorResponse({
            httpStatus:
                503,

            errorCode:
                result &&
                typeof result.errorCode ===
                    "string" &&
                result.errorCode
                    ? result.errorCode
                    : "voice_communication_revision_unavailable",

            requestId
        });
    }
}

module.exports =
    VoiceCommunicationRevisionTransport;
