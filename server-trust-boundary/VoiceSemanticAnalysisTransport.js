"use strict";

const crypto =
    require("crypto");


class VoiceSemanticAnalysisTransport {
    constructor({
        analysisAccessService,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !analysisAccessService ||
            typeof analysisAccessService
                .analyzeRecording !==
                "function"
        ) {
            throw new Error(
                "VoiceSemanticAnalysisTransport requires analysisAccessService"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "VoiceSemanticAnalysisTransport requires credentialTransport"
            );
        }

        this.analysisAccessService =
            analysisAccessService;

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
            typeof body !==
                "object" ||
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
            new Set([
                "recordingId"
            ]);

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

        const normalizedHeaders =
            {};

        for (
            const [key, value]
            of Object.entries(
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
                await this.analysisAccessService
                    .analyzeRecording({
                        connectorId:
                            connectorId.trim(),

                        credential,

                        recordingId:
                            body.recordingId
                    });
        } catch {
            return this.createErrorResponse({
                httpStatus:
                    503,

                errorCode:
                    "voice_semantic_analysis_unavailable",

                requestId
            });
        }

        if (
            result?.status ===
                "ready"
        ) {
            return {
                httpStatus:
                    200,

                body: {
                    requestId,

                    status:
                        "ready",

                    recordingId:
                        result.recordingId,

                    analyses:
                        Array.isArray(
                            result.analyses
                        )
                            ? result.analyses
                            : []
                }
            };
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
                    "voice_semantic_analysis_request_invalid",

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
                    : "voice_semantic_analysis_unavailable",

            requestId
        });
    }
}


module.exports =
    VoiceSemanticAnalysisTransport;
