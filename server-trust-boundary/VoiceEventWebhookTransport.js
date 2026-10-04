"use strict";

const SUPPORTED_EVENT_STATUSES =
    new Set([
        "started",
        "ringing",
        "answered",
        "completed",
        "busy",
        "cancelled",
        "unanswered",
        "rejected",
        "failed",
        "timeout"
    ]);


function normalizeTimestamp(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    if (
        typeof value !== "string"
    ) {
        return null;
    }

    const normalized =
        value.trim();

    if (
        !normalized ||
        !Number.isFinite(
            Date.parse(normalized)
        )
    ) {
        return null;
    }

    return normalized;
}


class VoiceEventWebhookTransport {
    constructor({
        webhookSignatureVerifier,
        communicationEventRepository,
        diagnosticLogger
    } = {}) {
        if (
            !webhookSignatureVerifier ||
            typeof webhookSignatureVerifier
                .verify !== "function"
        ) {
            throw new Error(
                "VoiceEventWebhookTransport requires webhookSignatureVerifier"
            );
        }

        if (
            !communicationEventRepository ||
            typeof communicationEventRepository
                .apply !== "function"
        ) {
            throw new Error(
                "VoiceEventWebhookTransport requires communicationEventRepository"
            );
        }

        this.webhookSignatureVerifier =
            webhookSignatureVerifier;

        this.communicationEventRepository =
            communicationEventRepository;

        this.diagnosticLogger =
            diagnosticLogger &&
            typeof diagnosticLogger.info ===
                "function"
                ? diagnosticLogger
                : null;
    }


    async handle({
        headers,
        body
    } = {}) {
        let signatureValid =
            false;

        try {
            signatureValid =
                await this
                    .webhookSignatureVerifier
                    .verify(
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
                        "voice_event_payload_invalid"
                }
            };
        }

        const conversationUuid =
            typeof body.conversation_uuid ===
                "string"
                ? body.conversation_uuid.trim()
                : "";

        const eventStatus =
            typeof body.status ===
                "string"
                ? body.status
                    .trim()
                    .toLowerCase()
                : "";

        const eventTimestamp =
            normalizeTimestamp(
                body.timestamp
            );

        if (
            !conversationUuid ||
            !eventStatus ||
            !eventTimestamp
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_event_payload_invalid"
                }
            };
        }

        if (
            !SUPPORTED_EVENT_STATUSES.has(
                eventStatus
            )
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_event_status_unsupported"
                }
            };
        }

        const startTime =
            normalizeTimestamp(
                body.start_time
            );

        const endTime =
            normalizeTimestamp(
                body.end_time
            );

        if (
            body.start_time !== undefined &&
            body.start_time !== null &&
            body.start_time !== "" &&
            !startTime
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_event_payload_invalid"
                }
            };
        }

        if (
            body.end_time !== undefined &&
            body.end_time !== null &&
            body.end_time !== "" &&
            !endTime
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_event_payload_invalid"
                }
            };
        }

        if (
            eventStatus === "completed" &&
            (
                !startTime ||
                !endTime
            )
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_event_payload_invalid"
                }
            };
        }

        let result;

        try {
            result =
                await this
                    .communicationEventRepository
                    .apply({
                        providerCallId:
                            conversationUuid,

                        eventStatus,

                        eventTimestamp,

                        startTime,

                        endTime
                    });
        } catch (error) {
            return {
                httpStatus: 503,

                body: {
                    errorCode:
                        "voice_event_processing_unavailable"
                }
            };
        }

        if (
            !result ||
            typeof result !== "object" ||
            ![
                "updated",
                "unchanged"
            ].includes(
                result.transitionStatus
            ) ||
            typeof result.resultStatus !==
                "string" ||
            !result.resultStatus.trim()
        ) {
            return {
                httpStatus: 503,

                body: {
                    errorCode:
                        "voice_event_processing_unavailable"
                }
            };
        }

        if (this.diagnosticLogger) {
            try {
                this.diagnosticLogger.info(
                    "RISEN VOICE EVENT DIAGNOSTIC",
                    {
                        authorizationPresent:
                            Boolean(
                                headers &&
                                headers.authorization
                            ),

                        status:
                            eventStatus,

                        detailPresent:
                            typeof body.detail ===
                                "string" &&
                            Boolean(
                                body.detail.trim()
                            ),

                        sipCodePresent:
                            body.sip_code !==
                                undefined &&
                            body.sip_code !==
                                null,

                        uuidPresent:
                            typeof body.uuid ===
                                "string" &&
                            Boolean(
                                body.uuid.trim()
                            ),

                        conversationUuidPresent:
                            Boolean(
                                conversationUuid
                            ),

                        httpStatus:
                            200
                    }
                );
            } catch {
            }
        }

        return {
            httpStatus: 200,

            body: {
                status:
                    "accepted",

                transitionStatus:
                    result.transitionStatus,

                resultStatus:
                    result.resultStatus
            }
        };
    }
}


module.exports =
    VoiceEventWebhookTransport;
