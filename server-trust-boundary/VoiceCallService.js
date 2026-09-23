"use strict";

/**
 * Voice Call Service
 *
 * Responsibility:
 * - authenticate the connector
 * - obtain verified facility context
 * - resolve the facility's active Vonage phone number
 * - initiate a Vonage outbound call
 *
 * Client-supplied facilityId is never used as authority.
 */
class VoiceCallService {
    constructor({
        connectorTrustService,
        facilityPhoneNumberRepository,
        vonageVoiceService
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "VoiceCallService requires connectorTrustService"
            );
        }

        if (
            !facilityPhoneNumberRepository ||
            typeof facilityPhoneNumberRepository
                .findActiveByFacilityId !==
                "function"
        ) {
            throw new Error(
                "VoiceCallService requires facilityPhoneNumberRepository"
            );
        }

        if (
            !vonageVoiceService ||
            typeof vonageVoiceService.createOutboundCall !==
                "function"
        ) {
            throw new Error(
                "VoiceCallService requires vonageVoiceService"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.facilityPhoneNumberRepository =
            facilityPhoneNumberRepository;

        this.vonageVoiceService =
            vonageVoiceService;
    }

    async call({
        connectorId,
        credential,
        to,
        answerUrl,
        eventUrl
    } = {}) {
        const normalizedTo =
            String(to || "").trim();

        if (!normalizedTo) {
            return {
                status: "invalid",
                errorCode:
                    "voice_destination_required"
            };
        }

        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService
                    .authenticate({
                        connectorId,
                        credential
                    });
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            !trustResult ||
            typeof trustResult !== "object" ||
            Array.isArray(trustResult)
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            trustResult.status ===
            "denied"
        ) {
            return {
                status: "denied",
                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status ===
            "error"
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            trustResult.status !==
            "verified"
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const verifiedContext =
            trustResult.verifiedContext;

        if (
            !verifiedContext ||
            typeof verifiedContext !==
                "object" ||
            !verifiedContext.facilityId
        ) {
            return {
                status: "error",
                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const verifiedFacilityId =
            verifiedContext.facilityId;

        let phoneNumber;

        try {
            phoneNumber =
                await this
                    .facilityPhoneNumberRepository
                    .findActiveByFacilityId(
                        verifiedFacilityId
                    );
        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "facility_phone_lookup_unavailable"
            };
        }

        if (!phoneNumber) {
            return {
                status: "not_ready",
                errorCode:
                    "facility_phone_number_not_configured"
            };
        }

        if (
            phoneNumber.provider !==
            "vonage" ||
            phoneNumber.status !==
            "active" ||
            !phoneNumber.phoneNumber
        ) {
            return {
                status: "error",
                errorCode:
                    "facility_phone_number_invalid"
            };
        }

        try {
            const result =
                await this
                    .vonageVoiceService
                    .createOutboundCall({
                        from:
                            phoneNumber.phoneNumber,

                        to:
                            normalizedTo,

                        answerUrl,
                        eventUrl
                    });

            return {
                status: "initiated",

                facilityId:
                    verifiedFacilityId,

                result
            };

        } catch (error) {
            return {
                status: "error",
                errorCode:
                    "vonage_voice_call_failed"
            };
        }
    }
}

module.exports = VoiceCallService;
