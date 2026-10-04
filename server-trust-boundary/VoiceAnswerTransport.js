"use strict";

const {
    normalizeJapanesePhoneNumber
} = require("../services/vonageVoiceService");


function normalizeInboundFacilityPhoneNumber(
    value
) {
    const normalized =
        String(
            value || ""
        )
            .trim()
            .replace(
                /[-\s()]/g,
                ""
            );

    if (
        /^0\d{9,10}$/.test(
            normalized
        )
    ) {
        return normalized;
    }

    if (
        /^81\d{9,10}$/.test(
            normalized
        )
    ) {
        return (
            "0" +
            normalized.slice(2)
        );
    }

    if (
        /^\+81\d{9,10}$/.test(
            normalized
        )
    ) {
        return (
            "0" +
            normalized.slice(3)
        );
    }

    throw new Error(
        "inbound facility phone number is invalid"
    );
}

class VoiceAnswerTransport {
    constructor({
        intentStore,
        webhookSignatureVerifier,
        phoneNumberNormalizer =
            normalizeJapanesePhoneNumber,
        conversationContextStore =
            null,
        communicationLogRepository =
            null,
        facilityPhoneNumberRepository =
            null,
        recordingEnabled =
            false,
        recordingEventUrl =
            null,
        voiceEventUrl =
            null,
        inboundApplicationUser =
            null
    } = {}) {
        if (
            !intentStore ||
            typeof intentStore.consume !==
                "function"
        ) {
            throw new Error(
                "VoiceAnswerTransport requires intentStore"
            );
        }

        if (
            !webhookSignatureVerifier ||
            typeof webhookSignatureVerifier.verify !==
                "function"
        ) {
            throw new Error(
                "VoiceAnswerTransport requires webhookSignatureVerifier"
            );
        }

        if (
            typeof phoneNumberNormalizer !==
                "function"
        ) {
            throw new Error(
                "VoiceAnswerTransport requires phoneNumberNormalizer"
            );
        }

        this.intentStore =
            intentStore;

        this.webhookSignatureVerifier =
            webhookSignatureVerifier;

        if (
            recordingEnabled &&
            (
                !conversationContextStore ||
                typeof conversationContextStore.put !==
                    "function"
            )
        ) {
            throw new Error(
                "VoiceAnswerTransport requires conversationContextStore when recording is enabled"
            );
        }

        this.conversationContextStore =
            conversationContextStore;

        this.communicationLogRepository =
            communicationLogRepository;

        if (
            facilityPhoneNumberRepository !== null &&
            (
                typeof facilityPhoneNumberRepository !==
                    "object" ||
                typeof facilityPhoneNumberRepository
                    .findActiveByPhoneNumber !==
                    "function"
            )
        ) {
            throw new Error(
                "VoiceAnswerTransport facilityPhoneNumberRepository is invalid"
            );
        }

        this.facilityPhoneNumberRepository =
            facilityPhoneNumberRepository;

        const normalizedInboundApplicationUser =
            typeof inboundApplicationUser === "string"
                ? inboundApplicationUser.trim()
                : "";

        if (
            normalizedInboundApplicationUser &&
            !/^[A-Za-z0-9_.-]{1,64}$/.test(
                normalizedInboundApplicationUser
            )
        ) {
            throw new Error(
                "VoiceAnswerTransport inboundApplicationUser is invalid"
            );
        }

        this.inboundApplicationUser =
            normalizedInboundApplicationUser ||
            null;

        if (
            typeof recordingEnabled !==
            "boolean"
        ) {
            throw new Error(
                "VoiceAnswerTransport recordingEnabled must be boolean"
            );
        }

        const voiceEventRequested =
            typeof voiceEventUrl ===
                "string" &&
            Boolean(
                voiceEventUrl.trim()
            );

        if (
            (
                recordingEnabled ||
                voiceEventRequested
            ) &&
            (
                !communicationLogRepository ||
                typeof communicationLogRepository.create !==
                    "function"
            )
        ) {
            throw new Error(
                "VoiceAnswerTransport requires communicationLogRepository when recording or call events are enabled"
            );
        }

        if (recordingEnabled) {
            if (
                typeof recordingEventUrl !==
                    "string" ||
                !recordingEventUrl.trim()
            ) {
                throw new Error(
                    "VoiceAnswerTransport requires recordingEventUrl when recording is enabled"
                );
            }

            let parsedRecordingEventUrl;

            try {
                parsedRecordingEventUrl =
                    new URL(
                        recordingEventUrl.trim()
                    );
            } catch (error) {
                throw new Error(
                    "VoiceAnswerTransport recordingEventUrl is invalid"
                );
            }

            if (
                parsedRecordingEventUrl.protocol !==
                "https:"
            ) {
                throw new Error(
                    "VoiceAnswerTransport recordingEventUrl must use HTTPS"
                );
            }
        }

        let normalizedVoiceEventUrl =
            null;

        if (
            voiceEventUrl !== null &&
            voiceEventUrl !== undefined &&
            voiceEventUrl !== ""
        ) {
            if (
                typeof voiceEventUrl !==
                    "string" ||
                !voiceEventUrl.trim()
            ) {
                throw new Error(
                    "VoiceAnswerTransport voiceEventUrl is invalid"
                );
            }

            let parsedVoiceEventUrl;

            try {
                parsedVoiceEventUrl =
                    new URL(
                        voiceEventUrl.trim()
                    );
            } catch (error) {
                throw new Error(
                    "VoiceAnswerTransport voiceEventUrl is invalid"
                );
            }

            if (
                parsedVoiceEventUrl.protocol !==
                "https:"
            ) {
                throw new Error(
                    "VoiceAnswerTransport voiceEventUrl must use HTTPS"
                );
            }

            normalizedVoiceEventUrl =
                voiceEventUrl.trim();
        }

        this.phoneNumberNormalizer =
            phoneNumberNormalizer;

        this.recordingEnabled =
            recordingEnabled;

        this.recordingEventUrl =
            recordingEnabled
                ? recordingEventUrl.trim()
                : null;

        this.voiceEventUrl =
            normalizedVoiceEventUrl;

        this.voiceEventEnabled =
            Boolean(
                normalizedVoiceEventUrl
            );
    }

    getIntentId({
        query,
        body
    } = {}) {
        const sources = [
            query,
            body
        ];

        for (const source of sources) {
            if (
                !source ||
                typeof source !== "object"
            ) {
                continue;
            }

            if (
                typeof source.intentId ===
                    "string" &&
                source.intentId.trim()
            ) {
                return source.intentId.trim();
            }

            if (
                typeof source.intent_id ===
                    "string" &&
                source.intent_id.trim()
            ) {
                return source.intent_id.trim();
            }

            const customData =
                source.custom_data ||
                source.customData;

            if (
                typeof customData ===
                    "string"
            ) {
                try {
                    const parsed =
                        JSON.parse(customData);

                    if (
                        parsed &&
                        typeof parsed.intentId ===
                            "string"
                    ) {
                        return parsed.intentId.trim();
                    }
                } catch (error) {
                    // Invalid custom data is rejected below.
                }
            }

            if (
                customData &&
                typeof customData ===
                    "object" &&
                typeof customData.intentId ===
                    "string"
            ) {
                return customData.intentId.trim();
            }
        }

        return "";
    }

    getConversationUuid({
        query,
        body
    } = {}) {
        const sources = [
            query,
            body
        ];

        for (const source of sources) {
            if (
                !source ||
                typeof source !== "object"
            ) {
                continue;
            }

            if (
                typeof source.conversation_uuid ===
                    "string" &&
                source.conversation_uuid.trim()
            ) {
                return source.conversation_uuid.trim();
            }

            if (
                typeof source.conversationUuid ===
                    "string" &&
                source.conversationUuid.trim()
            ) {
                return source.conversationUuid.trim();
            }
        }

        return "";
    }

    async handle({
        headers,
        query,
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

        const intentId =
            this.getIntentId({
                query,
                body
            });

        if (!intentId) {
            const inboundFrom =
                String(
                    body?.from ||
                    query?.from ||
                    ""
                ).trim();

            const inboundTo =
                String(
                    body?.to ||
                    query?.to ||
                    ""
                ).trim();

            const inboundConversationUuid =
                this.getConversationUuid({
                    query,
                    body
                });

            if (
                this.inboundApplicationUser &&
                inboundFrom &&
                inboundTo &&
                inboundConversationUuid
            ) {
                if (
                    !this.facilityPhoneNumberRepository ||
                    !this.communicationLogRepository ||
                    typeof this.communicationLogRepository
                        .createInbound !==
                        "function"
                ) {
                    return {
                        httpStatus:
                            503,

                        body: {
                            errorCode:
                                "voice_inbound_persistence_unavailable"
                        }
                    };
                }

                let domesticInboundTo;

                try {
                    domesticInboundTo =
                        normalizeInboundFacilityPhoneNumber(
                            inboundTo
                        );
                } catch (error) {
                    return {
                        httpStatus:
                            422,

                        body: {
                            errorCode:
                                "voice_inbound_phone_number_invalid"
                        }
                    };
                }

                let facilityPhoneNumber;

                try {
                    facilityPhoneNumber =
                        await this
                            .facilityPhoneNumberRepository
                            .findActiveByPhoneNumber(
                                domesticInboundTo
                            );
                } catch (error) {
                    return {
                        httpStatus:
                            503,

                        body: {
                            errorCode:
                                "voice_inbound_facility_lookup_unavailable"
                        }
                    };
                }

                if (!facilityPhoneNumber) {
                    return {
                        httpStatus:
                            404,

                        body: {
                            errorCode:
                                "voice_inbound_facility_not_found"
                        }
                    };
                }

                try {
                    await this
                        .communicationLogRepository
                        .createInbound({
                            facilityId:
                                facilityPhoneNumber
                                    .facilityId,

                            fromPhone:
                                inboundFrom,

                            toPhone:
                                domesticInboundTo,

                            providerCallId:
                                inboundConversationUuid
                        });
                } catch (error) {
                    return {
                        httpStatus:
                            503,

                        body: {
                            errorCode:
                                "voice_inbound_log_creation_unavailable"
                        }
                    };
                }

                const inboundConnectAction = {
                    action:
                        "connect",

                    from:
                        inboundFrom,

                    endpoint: [
                        {
                            type:
                                "app",

                            user:
                                this.inboundApplicationUser
                        }
                    ]
                };

                if (this.voiceEventEnabled) {
                    inboundConnectAction.eventUrl = [
                        this.voiceEventUrl
                    ];

                    inboundConnectAction.eventMethod =
                        "POST";
                }

                return {
                    httpStatus: 200,
                    body: [
                        inboundConnectAction
                    ]
                };
            }

            return {
                httpStatus: 400,
                body: {
                    errorCode:
                        "voice_intent_required"
                }
            };
        }

        const conversationUuid =
            this.getConversationUuid({
                query,
                body
            });

        if (
            (
                this.recordingEnabled ||
                this.voiceEventEnabled
            ) &&
            !conversationUuid
        ) {
            return {
                httpStatus: 400,

                body: {
                    errorCode:
                        "voice_conversation_required"
                }
            };
        }

        const intent =
            this.intentStore.consume(
                intentId
            );

        if (!intent) {
            return {
                httpStatus: 404,
                body: {
                    errorCode:
                        "voice_intent_invalid_or_expired"
                }
            };
        }

        let normalizedFrom;
        let normalizedTo;

        try {
            normalizedFrom =
                this.phoneNumberNormalizer(
                    intent.fromNumber,
                    "元"
                );

            normalizedTo =
                this.phoneNumberNormalizer(
                    intent.phoneNumber,
                    "先"
                );
        } catch (error) {
            return {
                httpStatus: 422,

                body: {
                    errorCode:
                        "voice_phone_number_invalid"
                }
            };
        }

        let communicationLogId =
            null;

        if (
            this.recordingEnabled ||
            this.voiceEventEnabled
        ) {
            try {
                const communicationLogResult =
                    await this.communicationLogRepository.create({
                        facilityId:
                            intent.facilityId,

                        caseId:
                            intent.caseId,

                        contactId:
                            intent.contactId,

                        providerCallId:
                            conversationUuid
                    });

                if (
                    !communicationLogResult ||
                    typeof communicationLogResult.communicationLogId !==
                        "string" ||
                    !communicationLogResult.communicationLogId.trim()
                ) {
                    throw new Error(
                        "voice_communication_log_invalid_result"
                    );
                }

                communicationLogId =
                    communicationLogResult
                        .communicationLogId
                        .trim();
            } catch (error) {
                return {
                    httpStatus: 503,

                    body: {
                        errorCode:
                            "voice_communication_log_unavailable"
                    }
                };
            }
        }

        if (this.recordingEnabled) {
            try {
                this.conversationContextStore.put({
                    conversationUuid,

                    facilityId:
                        intent.facilityId,

                    caseId:
                        intent.caseId,

                    contactId:
                        intent.contactId,

                    communicationLogId
                });
            } catch (error) {
                return {
                    httpStatus: 503,

                    body: {
                        errorCode:
                            "voice_conversation_context_unavailable"
                    }
                };
            }
        }

        const ncco = [];

        if (this.recordingEnabled) {
            ncco.push({
                action:
                    "record",

                /*
                 * Separate the browser side and
                 * PSTN side for later transcription.
                 */
                split:
                    "conversation",

                channels:
                    2,

                format:
                    "wav",

                /*
                 * Audible cue for this PoC recording.
                 */
                beepStart:
                    true,

                eventUrl: [
                    this.recordingEventUrl
                ],

                eventMethod:
                    "POST"
            });
        }

        const connectAction = {
            action:
                "connect",

            from:
                normalizedFrom,

            endpoint: [
                {
                    type:
                        "phone",

                    number:
                        normalizedTo
                }
            ]
        };

        if (this.voiceEventEnabled) {
            connectAction.eventUrl = [
                this.voiceEventUrl
            ];

            connectAction.eventMethod =
                "POST";
        }

        ncco.push(
            connectAction
        );

        return {
            httpStatus: 200,

            body:
                ncco
        };
    }
}

module.exports =
    VoiceAnswerTransport;
