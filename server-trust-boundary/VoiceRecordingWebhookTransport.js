"use strict";

class VoiceRecordingWebhookTransport {
    constructor({
        webhookSignatureVerifier,
        conversationContextStore,
        processingService,
        diagnosticLogger
    } = {}) {
        if (
            !webhookSignatureVerifier ||
            typeof webhookSignatureVerifier.verify !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingWebhookTransport requires webhookSignatureVerifier"
            );
        }

        this.webhookSignatureVerifier =
            webhookSignatureVerifier;

        if (
            !conversationContextStore ||
            typeof conversationContextStore.get !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingWebhookTransport requires conversationContextStore"
            );
        }

        this.conversationContextStore =
            conversationContextStore;

        if (
            !processingService ||
            typeof processingService.process !==
                "function"
        ) {
            throw new Error(
                "VoiceRecordingWebhookTransport requires processingService"
            );
        }

        this.processingService =
            processingService;

        this.diagnosticLogger =
            diagnosticLogger &&
            typeof diagnosticLogger.info ===
                "function"
                ? diagnosticLogger
                : {
                    info() {}
                };
    }

    async handle({
        headers,
        body
    } = {}) {
        let signatureValid =
            false;

        try {
            signatureValid =
                await this.webhookSignatureVerifier.verify(
                    headers || {}
                );
        } catch (error) {
            signatureValid =
                false;
        }

        if (!signatureValid) {
            return {
                httpStatus: 401,

                body: {
                    errorCode:
                        "voice_webhook_unauthorized"
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
                    errorCode:
                        "voice_recording_payload_invalid"
                }
            };
        }

        const recordingUuid =
            typeof body.recording_uuid ===
                "string"
                ? body.recording_uuid.trim()
                : "";

        const conversationUuid =
            typeof body.conversation_uuid ===
                "string"
                ? body.conversation_uuid.trim()
                : "";

        const recordingUrl =
            typeof body.recording_url ===
                "string"
                ? body.recording_url.trim()
                : "";

        if (
            !recordingUuid ||
            !conversationUuid ||
            !recordingUrl
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_recording_payload_invalid"
                }
            };
        }

        let parsedRecordingUrl;

        try {
            parsedRecordingUrl =
                new URL(recordingUrl);
        } catch (error) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_recording_payload_invalid"
                }
            };
        }

        if (
            parsedRecordingUrl.protocol !==
            "https:"
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_recording_payload_invalid"
                }
            };
        }

        let conversationContext;

        try {
            conversationContext =
                this.conversationContextStore.get(
                    conversationUuid
                );
        } catch (error) {
            return {
                httpStatus: 503,

                body: {
                    errorCode:
                        "voice_conversation_context_unavailable"
                }
            };
        }

        if (!conversationContext) {
            return {
                httpStatus: 404,

                body: {
                    errorCode:
                        "voice_conversation_context_not_found"
                }
            };
        }

        const communicationLogId =
            typeof conversationContext
                .communicationLogId ===
                "string"
                ? conversationContext
                    .communicationLogId
                    .trim()
                : "";

        if (!communicationLogId) {
            return {
                httpStatus: 503,

                body: {
                    errorCode:
                        "voice_recording_context_incomplete"
                }
            };
        }

        let processingResult;

        try {
            processingResult =
                await this.processingService.process({
                    recordingUuid,
                    conversationUuid,
                    recordingUrl,
                    conversationContext
                });
        } catch (error) {
            return {
                httpStatus: 503,

                body: {
                    errorCode:
                        "voice_recording_processing_unavailable"
                }
            };
        }

        if (
            !processingResult ||
            typeof processingResult !==
                "object" ||
            ![
                "stored",
                "duplicate"
            ].includes(
                processingResult.status
            )
        ) {
            return {
                httpStatus: 503,

                body: {
                    errorCode:
                        "voice_recording_processing_unavailable"
                }
            };
        }

        this.diagnosticLogger.info(
            "RISEN VOICE RECORDING COMPLETED",
            {
                recordingUuid,
                conversationUuid,
                recordingUrlPresent:
                    true,
                contextResolved:
                    true,
                processingStatus:
                    processingResult.status,
                size:
                    body.size ?? null,
                startTime:
                    body.start_time || null,
                endTime:
                    body.end_time || null,
                timestamp:
                    body.timestamp || null
            }
        );

        return {
            httpStatus: 200,

            body: {
                status:
                    "accepted",

                recordingUuid
            }
        };
    }
}

module.exports =
    VoiceRecordingWebhookTransport;
