"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceAnswerTransport =
    require("./VoiceAnswerTransport");

const VoiceCallIntentStore =
    require("./VoiceCallIntentStore");


test(
    "signed PSTN inbound call without intent connects to RISEN CARE client user",
    async () => {
        const transport =
            new VoiceAnswerTransport({
                intentStore:
                    new VoiceCallIntentStore(),

                webhookSignatureVerifier: {
                    verify() {
                        return true;
                    }
                },

                inboundApplicationUser:
                    "risencare-emergency",

                voiceEventUrl:
                    "https://example.test/voice/event",

                facilityPhoneNumberRepository: {
                    async findActiveByPhoneNumber() {
                        return {
                            facilityId:
                                "facility-A"
                        };
                    }
                },

                communicationLogRepository: {
                    async create() {},

                    async createInbound() {}
                }
            });

        const result =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer valid-token"
                },

                body: {
                    from:
                        "819000000000",

                    to:
                        "815000000000",

                    uuid:
                        "CALL-INBOUND-A",

                    conversation_uuid:
                        "CON-INBOUND-A"
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.deepEqual(
            result.body,
            [
                {
                    action:
                        "connect",

                    from:
                        "819000000000",

                    endpoint: [
                        {
                            type:
                                "app",

                            user:
                                "risencare-emergency"
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
