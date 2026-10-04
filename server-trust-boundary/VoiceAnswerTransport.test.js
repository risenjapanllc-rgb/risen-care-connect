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
    "国内番号をE.164へ正規化してNCCOを返す",
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
                    "09049373052"
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
                query: {
                    intentId
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
                        "815032021021",

                    endpoint: [
                        {
                            type:
                                "phone",

                            number:
                                "819049373052"
                        }
                    ]
                }
            ]
        );

        const replay =
            await transport.handle({
                query: {
                    intentId
                }
            });

        assert.equal(
            replay.httpStatus,
            404
        );

        assert.equal(
            replay.body.errorCode,
            "voice_intent_invalid_or_expired"
        );
    }
);


test(
    "不正な宛先番号ではconnectを返さない",
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
                    "87654321"
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
                query: {
                    intentId
                }
            });

        assert.equal(
            result.httpStatus,
            422
        );

        assert.equal(
            result.body.errorCode,
            "voice_phone_number_invalid"
        );

        const replay =
            await transport.handle({
                query: {
                    intentId
                }
            });

        assert.equal(
            replay.httpStatus,
            404
        );
    }
);


test(
    "不正なVonage署名ではintentを消費しない",
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
                    "09049373052"
            });

        let signatureValid =
            false;

        let receivedHeaders =
            null;

        const webhookSignatureVerifier = {
            verify(headers = {}) {
                receivedHeaders =
                    headers;

                return signatureValid;
            }
        };

        const transport =
            new VoiceAnswerTransport({
                intentStore,
                webhookSignatureVerifier
            });

        const rejected =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer invalid-token"
                },

                query: {
                    intentId
                }
            });

        assert.equal(
            rejected.httpStatus,
            401
        );

        assert.equal(
            rejected.body.errorCode,
            "voice_webhook_unauthorized"
        );

        assert.equal(
            receivedHeaders.authorization,
            "Bearer invalid-token"
        );

        /*
         * The failed webhook must not consume
         * the one-time voice intent.
         */
        signatureValid =
            true;

        const accepted =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer valid-token"
                },

                query: {
                    intentId
                }
            });

        assert.equal(
            accepted.httpStatus,
            200
        );
    }
);


test(
    "着信先Vonage番号を国内形式にして施設を逆引きする",
    async () => {
        const receivedPhoneNumbers =
            [];

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

                facilityPhoneNumberRepository: {
                    async findActiveByPhoneNumber(
                        phoneNumber
                    ) {
                        receivedPhoneNumbers.push(
                            phoneNumber
                        );

                        return {
                            id:
                                "phone-A",

                            facilityId:
                                "facility-A",

                            phoneNumber:
                                "05032021021",

                            provider:
                                "vonage",

                            status:
                                "active"
                        };
                    }
                },

                communicationLogRepository: {
                    async createInbound(input) {
                        assert.deepEqual(
                            input,
                            {
                                facilityId:
                                    "facility-A",

                                fromPhone:
                                    "819049373052",

                                toPhone:
                                    "05032021021",

                                providerCallId:
                                    "CON-inbound-test"
                            }
                        );

                        return {
                            communicationLogId:
                                "log-A"
                        };
                    }
                }
            });

        const result =
            await transport.handle({
                body: {
                    from:
                        "819049373052",

                    to:
                        "815032021021",

                    conversation_uuid:
                        "CON-inbound-test"
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.deepEqual(
            receivedPhoneNumbers,
            [
                "05032021021"
            ]
        );

        assert.deepEqual(
            result.body,
            [
                {
                    action:
                        "connect",

                    from:
                        "819049373052",

                    endpoint: [
                        {
                            type:
                                "app",

                            user:
                                "risencare-emergency"
                        }
                    ]
                }
            ]
        );
    }
);
