"use strict";

/**
 * Voice Call Service
 *
 * Responsibility:
 * - authenticate the connector
 * - obtain verified facility context
 * - resolve the facility's active Vonage phone number
 * - resolve the emergency contact phone number from
 *   the verified facility + case/contact relationship
 * - record the observed call-start action
 * - initiate a Vonage outbound call
 *
 * Client-supplied facilityId / phoneNumber / to are never
 * used as authority.
 */
class VoiceCallService {
    constructor({
        connectorTrustService,
        facilityPhoneNumberRepository,
        emergencyContactRepository,
        emergencyContactCallRepository,
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
            !emergencyContactRepository ||
            typeof emergencyContactRepository
                .findActiveByCaseAndContact !==
                "function"
        ) {
            throw new Error(
                "VoiceCallService requires emergencyContactRepository"
            );
        }

        if (
            !emergencyContactCallRepository ||
            typeof emergencyContactCallRepository
                .recordCallStarted !==
                "function"
        ) {
            throw new Error(
                "VoiceCallService requires emergencyContactCallRepository"
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

        this.emergencyContactRepository =
            emergencyContactRepository;

        this.emergencyContactCallRepository =
            emergencyContactCallRepository;

        this.vonageVoiceService =
            vonageVoiceService;
    }

    async call({
        connectorId,
        credential,
        caseId,
        contactId,
        recordingSessionId
    } = {}) {
        const normalizedCaseId =
            String(caseId || "").trim();

        const normalizedContactId =
            String(contactId || "").trim();

        const normalizedRecordingSessionId =
            String(recordingSessionId || "").trim();

        if (
            !normalizedCaseId ||
            !normalizedContactId
        ) {
            return {
                status:
                    "invalid",

                errorCode:
                    "emergency_contact_target_required"
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
                status:
                    "error",

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
                status:
                    "error",

                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        if (
            trustResult.status ===
            "denied"
        ) {
            return {
                status:
                    "denied",

                errorCode:
                    "connector_trust_denied"
            };
        }

        if (
            trustResult.status ===
            "error"
        ) {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_unavailable"
            };
        }

        if (
            trustResult.status !==
            "verified"
        ) {
            return {
                status:
                    "error",

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
                status:
                    "error",

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
                status:
                    "error",

                errorCode:
                    "facility_phone_lookup_unavailable"
            };
        }

        if (!phoneNumber) {
            return {
                status:
                    "not_ready",

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
                status:
                    "error",

                errorCode:
                    "facility_phone_number_invalid"
            };
        }

        let contact;

        try {
            contact =
                await this
                    .emergencyContactRepository
                    .findActiveByCaseAndContact({
                        facilityId:
                            verifiedFacilityId,

                        caseId:
                            normalizedCaseId,

                        contactId:
                            normalizedContactId
                    });
        } catch (error) {
            return {
                status:
                    "error",

                errorCode:
                    "emergency_contact_lookup_unavailable"
            };
        }

        if (
            !contact ||
            typeof contact !== "object" ||
            Array.isArray(contact) ||
            typeof contact.phoneNumber !==
                "string" ||
            !contact.phoneNumber.trim()
        ) {
            return {
                status:
                    "error",

                errorCode:
                    "emergency_contact_invalid"
            };
        }

        /*
         * This event records the observed user action.
         * It does not mean that Vonage connected the call.
         */
        try {
            await this
                .emergencyContactCallRepository
                .recordCallStarted({
                    caseId:
                        normalizedCaseId,

                    contactId:
                        normalizedContactId,

                    recordingSessionId:
                        normalizedRecordingSessionId ||
                        null
                });
        } catch (error) {
            return {
                status:
                    "error",

                errorCode:
                    "emergency_contact_call_record_failed"
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
                            contact.phoneNumber
                    });

            return {
                status:
                    "initiated",

                facilityId:
                    verifiedFacilityId,

                result
            };
        } catch (error) {
            return {
                status:
                    "error",

                errorCode:
                    "vonage_voice_call_failed"
            };
        }
    }
}

module.exports =
    VoiceCallService;
