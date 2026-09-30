"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const VoiceCallHttpAdapter =
    require("./VoiceCallHttpAdapter");


const CASE_ID =
    "11111111-1111-4111-8111-111111111111";

const CONTACT_ID =
    "22222222-2222-4222-8222-222222222222";

const RECORDING_SESSION_ID =
    "33333333-3333-4333-8333-333333333333";


function createAdapter({
    serviceResult = {
        status:
            "initiated",

        facilityId:
            "facility-A",

        result: {
            uuid:
                "test-call-id"
        }
    }
} = {}) {
    const calls = [];

    const adapter =
        new VoiceCallHttpAdapter({
            voiceCallService: {
                async call(args) {
                    calls.push(args);
                    return serviceResult;
                }
            }
        });

    return {
        adapter,
        calls
    };
}


test(
    "新しいemergency contact契約をServiceへ渡す",
    async () => {
        const {
            adapter,
            calls
        } = createAdapter();

        const result =
            await adapter.handle({
                requestId:
                    "request-A",

                connectorId:
                    "connector-A",

                credential:
                    "test-credential",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID,

                // HTTP入力に存在してもServiceへ渡してはいけない
                to:
                    "09999999999",

                phoneNumber:
                    "09999999999",

                facilityId:
                    "facility-ATTACKER",

                answerUrl:
                    "https://attacker.example/answer",

                eventUrl:
                    "https://attacker.example/event",

                ncco:
                    [
                        {
                            action:
                                "talk",

                            text:
                                "attacker"
                        }
                    ]
            });

        assert.equal(
            result.statusCode,
            200
        );

        assert.deepEqual(
            calls,
            [{
                connectorId:
                    "connector-A",

                credential:
                    "test-credential",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID,

                recordingSessionId:
                    RECORDING_SESSION_ID
            }]
        );

        assert.deepEqual(
            result.body,
            {
                requestId:
                    "request-A",

                status:
                    "initiated",

                facilityId:
                    "facility-A",

                result: {
                    uuid:
                        "test-call-id"
                }
            }
        );
    }
);


test(
    "Serviceのdeniedを401へ変換する",
    async () => {
        const {
            adapter
        } = createAdapter({
            serviceResult: {
                status:
                    "denied"
            }
        });

        const result =
            await adapter.handle({
                requestId:
                    "request-denied",

                connectorId:
                    "connector-A",

                credential:
                    "test-credential",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID
            });

        assert.equal(
            result.statusCode,
            401
        );

        assert.deepEqual(
            result.body,
            {
                requestId:
                    "request-denied",

                status:
                    "denied",

                errorCode:
                    "connector_trust_denied"
            }
        );
    }
);


test(
    "Serviceのinvalidを422へ変換する",
    async () => {
        const {
            adapter
        } = createAdapter({
            serviceResult: {
                status:
                    "invalid",

                errorCode:
                    "emergency_contact_target_required"
            }
        });

        const result =
            await adapter.handle({
                requestId:
                    "request-invalid",

                connectorId:
                    "connector-A",

                credential:
                    "test-credential"
            });

        assert.equal(
            result.statusCode,
            422
        );

        assert.equal(
            result.body.status,
            "invalid"
        );

        assert.equal(
            result.body.errorCode,
            "emergency_contact_target_required"
        );
    }
);


test(
    "Serviceのnot_readyを409へ変換する",
    async () => {
        const {
            adapter
        } = createAdapter({
            serviceResult: {
                status:
                    "not_ready",

                errorCode:
                    "facility_phone_number_not_configured"
            }
        });

        const result =
            await adapter.handle({
                requestId:
                    "request-not-ready",

                connectorId:
                    "connector-A",

                credential:
                    "test-credential",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID
            });

        assert.equal(
            result.statusCode,
            409
        );

        assert.deepEqual(
            result.body,
            {
                requestId:
                    "request-not-ready",

                status:
                    "not_ready",

                errorCode:
                    "facility_phone_number_not_configured"
            }
        );
    }
);


test(
    "Service例外は503の安全なエラーへ変換する",
    async () => {
        const logs = [];

        const adapter =
            new VoiceCallHttpAdapter({
                voiceCallService: {
                    async call() {
                        throw new Error(
                            "unexpected failure"
                        );
                    }
                },

                diagnosticLogger: {
                    error(entry) {
                        logs.push(entry);
                    }
                }
            });

        const result =
            await adapter.handle({
                requestId:
                    "request-error",

                connectorId:
                    "connector-A",

                credential:
                    "test-credential",

                caseId:
                    CASE_ID,

                contactId:
                    CONTACT_ID
            });

        assert.equal(
            result.statusCode,
            503
        );

        assert.deepEqual(
            result.body,
            {
                requestId:
                    "request-error",

                status:
                    "error",

                errorCode:
                    "voice_processing_unavailable"
            }
        );

        assert.deepEqual(
            logs,
            [{
                requestId:
                    "request-error",

                status:
                    "error",

                internalErrorCode:
                    "voice_application_exception"
            }]
        );
    }
);
