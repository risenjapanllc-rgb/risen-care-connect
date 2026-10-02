"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceRecordingWebhookTransport =
    require("./VoiceRecordingWebhookTransport");


function validBody() {
    return {
        recording_uuid:
            "recording-A",

        conversation_uuid:
            "CON-A",

        recording_url:
            "https://api-us.nexmo.com/v1/files/recording-A"
    };
}


function context() {
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


test(
    "passes resolved communication context into recording processing",
    async () => {
        let received =
            null;

        const transport =
            new VoiceRecordingWebhookTransport({
                webhookSignatureVerifier: {
                    async verify() {
                        return true;
                    }
                },

                conversationContextStore: {
                    get() {
                        return context();
                    }
                },

                processingService: {
                    async process(input) {
                        received =
                            input;

                        return {
                            status:
                                "stored"
                        };
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer valid"
                },

                body:
                    validBody()
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.status,
            "accepted"
        );

        assert.deepEqual(
            received,
            {
                recordingUuid:
                    "recording-A",

                conversationUuid:
                    "CON-A",

                recordingUrl:
                    "https://api-us.nexmo.com/v1/files/recording-A",

                conversationContext:
                    context()
            }
        );
    }
);


test(
    "fails closed when communication log context is missing",
    async () => {
        let processCalled =
            false;

        const transport =
            new VoiceRecordingWebhookTransport({
                webhookSignatureVerifier: {
                    async verify() {
                        return true;
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
                                "contact-A"
                        };
                    }
                },

                processingService: {
                    async process() {
                        processCalled =
                            true;

                        return {
                            status:
                                "stored"
                        };
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {},
                body:
                    validBody()
            });

        assert.equal(
            result.httpStatus,
            503
        );

        assert.equal(
            result.body.errorCode,
            "voice_recording_context_incomplete"
        );

        assert.equal(
            processCalled,
            false
        );
    }
);


test(
    "returns unavailable when recording processing fails",
    async () => {
        const transport =
            new VoiceRecordingWebhookTransport({
                webhookSignatureVerifier: {
                    async verify() {
                        return true;
                    }
                },

                conversationContextStore: {
                    get() {
                        return context();
                    }
                },

                processingService: {
                    async process() {
                        throw new Error(
                            "storage unavailable"
                        );
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {},
                body:
                    validBody()
            });

        assert.equal(
            result.httpStatus,
            503
        );

        assert.equal(
            result.body.errorCode,
            "voice_recording_processing_unavailable"
        );
    }
);
