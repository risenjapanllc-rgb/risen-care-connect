"use strict";

class VoiceCallHttpAdapter {
    constructor({
        voiceCallService,
        diagnosticLogger
    } = {}) {
        if (
            !voiceCallService ||
            typeof voiceCallService.call !==
                "function"
        ) {
            throw new Error(
                "VoiceCallHttpAdapter requires voiceCallService"
            );
        }

        this.voiceCallService =
            voiceCallService;

        this.diagnosticLogger =
            diagnosticLogger &&
            typeof diagnosticLogger.error ===
                "function"
                ? diagnosticLogger
                : null;
    }

    diagnoseError(
        requestId,
        internalErrorCode
    ) {
        if (!this.diagnosticLogger) {
            return;
        }

        try {
            this.diagnosticLogger.error({
                requestId,
                status: "error",
                internalErrorCode
            });
        } catch (error) {
            // Diagnostics must never affect request processing.
        }
    }

    createSafeProcessingError(
        requestId
    ) {
        return {
            statusCode: 503,

            body: {
                requestId,

                status:
                    "error",

                errorCode:
                    "voice_processing_unavailable"
            }
        };
    }

    async handle({
        requestId,
        connectorId,
        credential,
        to,
        answerUrl,
        eventUrl
    } = {}) {
        let result;

        try {
            result =
                await this.voiceCallService.call({
                    connectorId,
                    credential,
                    to,
                    answerUrl,
                    eventUrl
                });
        } catch (error) {
            this.diagnoseError(
                requestId,
                "voice_application_exception"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result)
        ) {
            this.diagnoseError(
                requestId,
                "application_result_invalid"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        if (
            result.status ===
            "initiated"
        ) {
            return {
                statusCode: 200,

                body: {
                    requestId,

                    status:
                        "initiated",

                    facilityId:
                        result.facilityId,

                    result:
                        result.result
                }
            };
        }

        if (
            result.status ===
            "denied"
        ) {
            return {
                statusCode: 401,

                body: {
                    requestId,

                    status:
                        "denied",

                    errorCode:
                        "connector_trust_denied"
                }
            };
        }

        if (
            result.status ===
            "invalid"
        ) {
            return {
                statusCode: 422,

                body: {
                    requestId,

                    status:
                        "invalid",

                    errorCode:
                        result.errorCode ||
                        "voice_request_invalid"
                }
            };
        }

        if (
            result.status ===
            "not_ready"
        ) {
            return {
                statusCode: 409,

                body: {
                    requestId,

                    status:
                        "not_ready",

                    errorCode:
                        result.errorCode ||
                        "facility_phone_number_not_configured"
                }
            };
        }

        if (
            result.status ===
            "error"
        ) {
            this.diagnoseError(
                requestId,
                result.errorCode ||
                    "voice_processing_error"
            );

            return this.createSafeProcessingError(
                requestId
            );
        }

        this.diagnoseError(
            requestId,
            "application_result_invalid"
        );

        return this.createSafeProcessingError(
            requestId
        );
    }
}

module.exports =
    VoiceCallHttpAdapter;
