"use strict";

const crypto =
    require("crypto");

class VoiceRecordingPlaybackTransport {
    constructor({
        playbackService,
        credentialTransport,
        connectorIdHeader =
            "x-risen-connector-id"
    } = {}) {
        if (
            !playbackService ||
            typeof playbackService.getPlayback !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingPlaybackTransport requires playbackService"
            );
        }

        if (
            !credentialTransport ||
            typeof credentialTransport.extract !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingPlaybackTransport requires credentialTransport"
            );
        }

        this.playbackService =
            playbackService;

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
            contentType
                .toLowerCase() !==
                "application/json"
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

        const allowedKeys = [
            "recordingId"
        ];

        for (
            const key of
                Object.keys(body)
        ) {
            if (
                !allowedKeys.includes(key)
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
            this.credentialTransport.extract(
                normalizedHeaders.authorization
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
                await this.playbackService
                    .getPlayback({
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
                    "voice_recording_playback_unavailable",

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

                    communicationLogId:
                        result.communicationLogId,

                    signedUrl:
                        result.signedUrl,

                    expiresIn:
                        result.expiresIn,

                    durationMs:
                        result.durationMs,

                    transcriptionStatus:
                        result.transcriptionStatus,

                    transcriptionText:
                        result.transcriptionText
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
                    "voice_recording_playback_request_invalid",

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
                    "voice_recording_not_found",

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
                    : "voice_recording_playback_unavailable",

            requestId
        });
    }
}

module.exports =
    VoiceRecordingPlaybackTransport;
