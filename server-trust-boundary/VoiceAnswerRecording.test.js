"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceAnswerTransport =
    require("./VoiceAnswerTransport");

const VoiceCallIntentStore =
    require("./VoiceCallIntentStore");

const VoiceConversationContextStore =
    require("./VoiceConversationContextStore");


test(
    "adds two-channel recording before connect when explicitly enabled",
    async () => {
        const intentStore =
            new VoiceCallIntentStore();

        const intentId =
            intentStore.create({
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

        const conversationContextStore =
            new VoiceConversationContextStore();

        const transport =
            new VoiceAnswerTransport({
                intentStore,

                conversationContextStore,

                communicationLogRepository: {
                    async create({
                        facilityId,
                        caseId,
                        contactId,
                        providerCallId
                    }) {
                        assert.deepEqual(
                            {
                                facilityId,
                                caseId,
                                contactId,
                                providerCallId
                            },
                            {
                                facilityId:
                                    "facility-A",

                                caseId:
                                    "case-A",

                                contactId:
                                    "contact-A",

                                providerCallId:
                                    "CON-A"
                            }
                        );

                        return {
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

                recordingEnabled:
                    true,

                recordingEventUrl:
                    "https://example.test/voice/recording"
            });

        const result =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer valid"
                },

                query: {
                    intentId,

                    conversation_uuid:
                        "CON-A"
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.length,
            2
        );

        assert.deepEqual(
            result.body[0],
            {
                action:
                    "record",

                split:
                    "conversation",

                channels:
                    2,

                format:
                    "wav",

                beepStart:
                    true,

                eventUrl: [
                    "https://example.test/voice/recording"
                ],

                eventMethod:
                    "POST"
            }
        );

        assert.equal(
            result.body[1].action,
            "connect"
        );

        assert.deepEqual(
            conversationContextStore.get(
                "CON-A"
            ),
            {
                facilityId:
                    "facility-A",

                caseId:
                    "case-A",

                contactId:
                    "contact-A",

                communicationLogId:
                    "communication-log-A"
            }
        );
    }
);


test(
    "keeps existing connect-only behavior when recording is disabled",
    async () => {
        const intentStore =
            new VoiceCallIntentStore();

        const intentId =
            intentStore.create({
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

        const transport =
            new VoiceAnswerTransport({
                intentStore,

                webhookSignatureVerifier: {
                    verify() {
                        return true;
                    }
                }
            });

        const result =
            await transport.handle({
                headers: {},

                query: {
                    intentId
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.length,
            1
        );

        assert.equal(
            result.body[0].action,
            "connect"
        );
    }
);
