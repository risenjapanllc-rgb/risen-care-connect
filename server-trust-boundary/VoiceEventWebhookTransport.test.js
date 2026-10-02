"use strict";

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const VoiceEventWebhookTransport =
    require("./VoiceEventWebhookTransport");


function createTransport({
    signatureValid = true,
    verifyImpl,
    applyImpl
} = {}) {
    return new VoiceEventWebhookTransport({
        webhookSignatureVerifier: {
            async verify(headers) {
                if (verifyImpl) {
                    return verifyImpl(
                        headers
                    );
                }

                return signatureValid;
            }
        },

        communicationEventRepository: {
            async apply(input) {
                if (applyImpl) {
                    return applyImpl(
                        input
                    );
                }

                return {
                    transitionStatus:
                        "updated",

                    communicationLogId:
                        "communication-log-A",

                    resultStatus:
                        "connected",

                    connectedAt:
                        "2026-10-02T03:00:05Z",

                    endedAt:
                        null
                };
            }
        }
    });
}


test(
    "rejects an invalid signature before inspecting or persisting the event",
    async () => {
        let applyCalled =
            false;

        const transport =
            createTransport({
                signatureValid:
                    false,

                async applyImpl() {
                    applyCalled =
                        true;

                    throw new Error(
                        "must not apply"
                    );
                }
            });

        const result =
            await transport.handle({
                headers: {},
                body: null
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
            applyCalled,
            false
        );
    }
);


test(
    "fails closed when signature verification throws",
    async () => {
        const transport =
            createTransport({
                async verifyImpl() {
                    throw new Error(
                        "verification failure"
                    );
                }
            });

        const result =
            await transport.handle({
                headers: {},
                body: {
                    conversation_uuid:
                        "CON-A",

                    status:
                        "answered",

                    timestamp:
                        "2026-10-02T03:00:05Z"
                }
            });

        assert.equal(
            result.httpStatus,
            401
        );
    }
);


test(
    "applies an answered event using conversation UUID and timestamp",
    async () => {
        let received;

        const transport =
            createTransport({
                async applyImpl(input) {
                    received =
                        input;

                    return {
                        transitionStatus:
                            "updated",

                        communicationLogId:
                            "communication-log-A",

                        resultStatus:
                            "connected",

                        connectedAt:
                            "2026-10-02T03:00:05Z",

                        endedAt:
                            null
                    };
                }
            });

        const result =
            await transport.handle({
                headers: {
                    authorization:
                        "Bearer signed"
                },

                body: {
                    conversation_uuid:
                        " CON-A ",

                    status:
                        " ANSWERED ",

                    timestamp:
                        "2026-10-02T03:00:05Z",

                    start_time:
                        null
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.deepEqual(
            received,
            {
                providerCallId:
                    "CON-A",

                eventStatus:
                    "answered",

                eventTimestamp:
                    "2026-10-02T03:00:05Z",

                startTime:
                    null,

                endTime:
                    null
            }
        );

        assert.deepEqual(
            result.body,
            {
                status:
                    "accepted",

                transitionStatus:
                    "updated",

                resultStatus:
                    "connected"
            }
        );
    }
);


test(
    "passes completed start and end timing to the repository",
    async () => {
        let received;

        const transport =
            createTransport({
                async applyImpl(input) {
                    received =
                        input;

                    return {
                        transitionStatus:
                            "updated",

                        communicationLogId:
                            "communication-log-A",

                        resultStatus:
                            "completed",

                        connectedAt:
                            "2026-10-02T03:00:05Z",

                        endedAt:
                            "2026-10-02T03:00:15Z"
                    };
                }
            });

        const result =
            await transport.handle({
                headers: {},

                body: {
                    conversation_uuid:
                        "CON-A",

                    status:
                        "completed",

                    timestamp:
                        "2026-10-02T03:00:15Z",

                    start_time:
                        "2026-10-02T03:00:05Z",

                    end_time:
                        "2026-10-02T03:00:15Z"
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            received.startTime,
            "2026-10-02T03:00:05Z"
        );

        assert.equal(
            received.endTime,
            "2026-10-02T03:00:15Z"
        );
    }
);


test(
    "rejects completed event without required timing before repository access",
    async () => {
        let applyCalled =
            false;

        const transport =
            createTransport({
                async applyImpl() {
                    applyCalled =
                        true;

                    throw new Error(
                        "must not apply"
                    );
                }
            });

        const result =
            await transport.handle({
                headers: {},

                body: {
                    conversation_uuid:
                        "CON-A",

                    status:
                        "completed",

                    timestamp:
                        "2026-10-02T03:00:15Z"
                }
            });

        assert.equal(
            result.httpStatus,
            400
        );

        assert.equal(
            result.body.errorCode,
            "voice_event_payload_invalid"
        );

        assert.equal(
            applyCalled,
            false
        );
    }
);


test(
    "rejects unsupported status before repository access",
    async () => {
        let applyCalled =
            false;

        const transport =
            createTransport({
                async applyImpl() {
                    applyCalled =
                        true;

                    throw new Error(
                        "must not apply"
                    );
                }
            });

        const result =
            await transport.handle({
                headers: {},

                body: {
                    conversation_uuid:
                        "CON-A",

                    status:
                        "invented",

                    timestamp:
                        "2026-10-02T03:00:05Z"
                }
            });

        assert.equal(
            result.httpStatus,
            400
        );

        assert.equal(
            result.body.errorCode,
            "voice_event_status_unsupported"
        );

        assert.equal(
            applyCalled,
            false
        );
    }
);


test(
    "returns retryable service unavailable when persistence fails",
    async () => {
        const transport =
            createTransport({
                async applyImpl() {
                    throw new Error(
                        "database unavailable"
                    );
                }
            });

        const result =
            await transport.handle({
                headers: {},

                body: {
                    conversation_uuid:
                        "CON-A",

                    status:
                        "unanswered",

                    timestamp:
                        "2026-10-02T03:00:15Z"
                }
            });

        assert.equal(
            result.httpStatus,
            503
        );

        assert.equal(
            result.body.errorCode,
            "voice_event_processing_unavailable"
        );
    }
);


test(
    "accepts an idempotently unchanged event",
    async () => {
        const transport =
            createTransport({
                async applyImpl() {
                    return {
                        transitionStatus:
                            "unchanged",

                        communicationLogId:
                            "communication-log-A",

                        resultStatus:
                            "completed",

                        connectedAt:
                            "2026-10-02T03:00:05Z",

                        endedAt:
                            "2026-10-02T03:00:15Z"
                    };
                }
            });

        const result =
            await transport.handle({
                headers: {},

                body: {
                    conversation_uuid:
                        "CON-A",

                    status:
                        "completed",

                    timestamp:
                        "2026-10-02T03:00:15Z",

                    start_time:
                        "2026-10-02T03:00:05Z",

                    end_time:
                        "2026-10-02T03:00:15Z"
                }
            });

        assert.equal(
            result.httpStatus,
            200
        );

        assert.equal(
            result.body.transitionStatus,
            "unchanged"
        );

        assert.equal(
            result.body.resultStatus,
            "completed"
        );
    }
);
