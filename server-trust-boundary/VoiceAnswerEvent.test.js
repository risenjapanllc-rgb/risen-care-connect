"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceAnswerTransport =
    require("./VoiceAnswerTransport");

const VoiceCallIntentStore =
    require("./VoiceCallIntentStore");


function createIntent(
    intentStore
) {
    return intentStore.create({
        facilityId:
            "facility-A",

        caseId:
            "case-A",

        contactId:
            "contact-A",

        fromNumber:
            "05032021021",

        phoneNumber:
            "09000000000"
    });
}


function signatureVerifier() {
    return {
        verify() {
            return true;
        }
    };
}


test(
    "adds connect event callback and creates communication log when recording is disabled",
    async () => {
        const intentStore =
            new VoiceCallIntentStore();

        const intentId =
            createIntent(
                intentStore
            );

        let createdInput =
            null;

        const transport =
            new VoiceAnswerTransport({
                intentStore,

                webhookSignatureVerifier:
                    signatureVerifier(),

                communicationLogRepository: {
                    async create(input) {
                        createdInput =
                            input;

                        return {
                            communicationLogId:
                                "communication-log-A"
                        };
                    }
                },

                voiceEventUrl:
                    "https://example.test/voice/event"
            });

        const result =
            await transport.handle({
                headers: {},

                query: {
                    intentId,

                    conversation_uuid:
                        "CON-EVENT-A"
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.deepEqual(
            createdInput,
            {
                facilityId:
                    "facility-A",

                caseId:
                    "case-A",

                contactId:
                    "contact-A",

                providerCallId:
                    "CON-EVENT-A"
            }
        );

        assert.deepEqual(
            result.body,
            [
                {
                    action:
                        "connect",

                    from:
                        "815032021021",

                    endpoint: [
                        {
                            type:
                                "phone",

                            number:
                                "819000000000"
                        }
                    ],

                    eventUrl: [
                        "https://example.test/voice/event"
                    ],

                    eventMethod:
                        "POST"
                }
            ]
        );
    }
);


test(
    "requires conversation UUID before consuming an event-enabled intent",
    async () => {
        const intentStore =
            new VoiceCallIntentStore();

        const intentId =
            createIntent(
                intentStore
            );

        let createCalls =
            0;

        const transport =
            new VoiceAnswerTransport({
                intentStore,

                webhookSignatureVerifier:
                    signatureVerifier(),

                communicationLogRepository: {
                    async create() {
                        createCalls +=
                            1;

                        return {
                            communicationLogId:
                                "communication-log-A"
                        };
                    }
                },

                voiceEventUrl:
                    "https://example.test/voice/event"
            });

        const rejected =
            await transport.handle({
                query: {
                    intentId
                }
            });

        assert.equal(
            rejected.httpStatus,
            400
        );

        assert.equal(
            rejected.body.errorCode,
            "voice_conversation_required"
        );

        assert.equal(
            createCalls,
            0
        );

        const accepted =
            await transport.handle({
                query: {
                    intentId,

                    conversation_uuid:
                        "CON-EVENT-A"
                }
            });

        assert.equal(
            accepted.httpStatus,
            200
        );

        assert.equal(
            createCalls,
            1
        );
    }
);


test(
    "requires communication log repository when call events are enabled",
    () => {
        assert.throws(
            () =>
                new VoiceAnswerTransport({
                    intentStore:
                        new VoiceCallIntentStore(),

                    webhookSignatureVerifier:
                        signatureVerifier(),

                    voiceEventUrl:
                        "https://example.test/voice/event"
                }),
            /communicationLogRepository/
        );
    }
);


test(
    "rejects unsafe voice event URLs",
    () => {
        const options = {
            intentStore:
                new VoiceCallIntentStore(),

            webhookSignatureVerifier:
                signatureVerifier(),

            communicationLogRepository: {
                async create() {
                    return {
                        communicationLogId:
                            "communication-log-A"
                    };
                }
            }
        };

        assert.throws(
            () =>
                new VoiceAnswerTransport({
                    ...options,

                    voiceEventUrl:
                        "not-a-url"
                }),
            /voiceEventUrl is invalid/
        );

        assert.throws(
            () =>
                new VoiceAnswerTransport({
                    ...options,

                    voiceEventUrl:
                        "http://example.test/voice/event"
                }),
            /voiceEventUrl must use HTTPS/
        );
    }
);
