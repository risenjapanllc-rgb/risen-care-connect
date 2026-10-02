"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceRecordingWebhookTransport =
    require("./VoiceRecordingWebhookTransport");


test(
    "rejects an unsigned recording webhook",
    async () => {
        let logged =
            false;

        const transport =
            new VoiceRecordingWebhookTransport({
                processingService: {
                    async process() {
                        return {
                            status:
                                "stored"
                        };
                    }
                },

                conversationContextStore: {
                    get() {
                        return {
                            facilityId:
                                "facility-A",

                            caseId:
                                "case-A",

                            contactId:
                                "contact-A",

                            communicationLogId:
                                "communication-log-A"
                        };
                    }
                },

                webhookSignatureVerifier: {
                    verify() {
                        return false;
                    }
                },

                diagnosticLogger: {
                    info() {
                        logged =
                            true;
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {},

                body: {
                    recording_uuid:
                        "recording-A",

                    conversation_uuid:
                        "CON-A",

                    recording_url:
                        "https://api.nexmo.com/v1/files/recording-A"
                }
            });

        assert.equal(
            result.httpStatus,
            401
        );

        assert.equal(
            result.body.errorCode,
            "voice_webhook_unauthorized"
        );

        assert.equal(
            logged,
            false
        );
    }
);


test(
    "accepts signed Vonage recording metadata",
    async () => {
        let loggedEvent =
            null;

        let loggedMetadata =
            null;

        const transport =
            new VoiceRecordingWebhookTransport({
                processingService: {
                    async process() {
                        return {
                            status:
                                "stored"
                        };
                    }
                },

                conversationContextStore: {
                    get() {
                        return {
                            facilityId:
                                "facility-A",

                            caseId:
                                "case-A",

                            contactId:
                                "contact-A",

                            communicationLogId:
                                "communication-log-A"
                        };
                    }
                },

                webhookSignatureVerifier: {
                    verify() {
                        return true;
                    }
                },

                diagnosticLogger: {
                    info(
                        event,
                        metadata
                    ) {
                        loggedEvent =
                            event;

                        loggedMetadata =
                            metadata;
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer valid"
                },

                body: {
                    recording_uuid:
                        "recording-A",

                    conversation_uuid:
                        "CON-A",

                    recording_url:
                        "https://api.nexmo.com/v1/files/recording-A",

                    size:
                        12345
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.status,
            "accepted"
        );

        assert.equal(
            result.body.recordingUuid,
            "recording-A"
        );

        assert.equal(
            loggedEvent,
            "RISEN VOICE RECORDING COMPLETED"
        );

        assert.equal(
            loggedMetadata.conversationUuid,
            "CON-A"
        );

        assert.equal(
            loggedMetadata.size,
            12345
        );

        assert.equal(
            loggedMetadata.recordingUrlPresent,
            true
        );

        assert.equal(
            loggedMetadata.contextResolved,
            true
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                loggedMetadata,
                "recordingUrl"
            ),
            false
        );
    }
);


test(
    "rejects recording metadata for an unknown conversation",
    async () => {
        const transport =
            new VoiceRecordingWebhookTransport({
                processingService: {
                    async process() {
                        return {
                            status:
                                "stored"
                        };
                    }
                },

                conversationContextStore: {
                    get() {
                        return null;
                    }
                },

                webhookSignatureVerifier: {
                    verify() {
                        return true;
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer valid"
                },

                body: {
                    recording_uuid:
                        "recording-A",

                    conversation_uuid:
                        "CON-UNKNOWN",

                    recording_url:
                        "https://api.nexmo.com/v1/files/recording-A"
                }
            });

        assert.equal(
            result.httpStatus,
            404
        );

        assert.equal(
            result.body.errorCode,
            "voice_conversation_context_not_found"
        );
    }
);


test(
    "rejects malformed recording metadata",
    async () => {
        const transport =
            new VoiceRecordingWebhookTransport({
                processingService: {
                    async process() {
                        return {
                            status:
                                "stored"
                        };
                    }
                },

                conversationContextStore: {
                    get() {
                        return {
                            facilityId:
                                "facility-A",

                            caseId:
                                "case-A",

                            contactId:
                                "contact-A",

                            communicationLogId:
                                "communication-log-A"
                        };
                    }
                },

                webhookSignatureVerifier: {
                    verify() {
                        return true;
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {},

                body: {
                    recording_uuid:
                        "recording-A"
                }
            });

        assert.equal(
            result.httpStatus,
            400
        );

        assert.equal(
            result.body.errorCode,
            "voice_recording_payload_invalid"
        );
    }
);
