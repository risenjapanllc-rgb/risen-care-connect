"use strict";

class VoiceClientTokenService {
    constructor({
        connectorTrustService,
        facilityPhoneNumberRepository,
        emergencyContactRepository,
        clientTokenFactory,
        intentStore
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "VoiceClientTokenService requires connectorTrustService"
            );
        }

        if (
            !facilityPhoneNumberRepository ||
            typeof facilityPhoneNumberRepository
                .findActiveByFacilityId !==
                "function"
        ) {
            throw new Error(
                "VoiceClientTokenService requires facilityPhoneNumberRepository"
            );
        }

        if (
            !intentStore ||
            typeof intentStore.create !==
                "function"
        ) {
            throw new Error(
                "VoiceClientTokenService requires intentStore"
            );
        }

        if (
            !emergencyContactRepository ||
            typeof emergencyContactRepository
                .findActiveByCaseAndContact !==
                "function"
        ) {
            throw new Error(
                "VoiceClientTokenService requires emergencyContactRepository"
            );
        }

        if (
            typeof clientTokenFactory !==
                "function"
        ) {
            throw new Error(
                "VoiceClientTokenService requires clientTokenFactory"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.facilityPhoneNumberRepository =
            facilityPhoneNumberRepository;

        this.emergencyContactRepository =
            emergencyContactRepository;

        this.clientTokenFactory =
            clientTokenFactory;

        this.intentStore =
            intentStore;
    }

    async issue({
        connectorId,
        credential,
        caseId,
        contactId
    } = {}) {
        const normalizedConnectorId =
            String(connectorId || "").trim();

        const normalizedCredential =
            String(credential || "").trim();

        const normalizedCaseId =
            String(caseId || "").trim();

        const normalizedContactId =
            String(contactId || "").trim();

        if (
            !normalizedConnectorId ||
            !normalizedCredential ||
            !normalizedCaseId ||
            !normalizedContactId
        ) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_token_request_invalid"
            };
        }

        let trustResult;

        try {
            trustResult =
                await this.connectorTrustService
                    .authenticate({
                        connectorId:
                            normalizedConnectorId,

                        credential:
                            normalizedCredential
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
            typeof trustResult !==
                "object" ||
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
                    typeof trustResult.errorCode === "string" &&
                    trustResult.errorCode.trim()
                        ? trustResult.errorCode.trim()
                        : "connector_trust_unavailable"
            };
        }

        if (
            trustResult.status !==
            "verified" ||
            !trustResult.verifiedContext ||
            !trustResult.verifiedContext.facilityId
        ) {
            return {
                status:
                    "error",

                errorCode:
                    "connector_trust_invalid_result"
            };
        }

        const facilityId =
            trustResult
                .verifiedContext
                .facilityId;

        let contact;
        let facilityPhoneNumber;

        try {
            contact =
                await this
                    .emergencyContactRepository
                    .findActiveByCaseAndContact({
                        facilityId,
                        caseId:
                            normalizedCaseId,
                        contactId:
                            normalizedContactId
                    });

            facilityPhoneNumber =
                await this
                    .facilityPhoneNumberRepository
                    .findActiveByFacilityId(
                        facilityId
                    );
        } catch (error) {
            return {
                status:
                    "invalid",

                errorCode:
                    "voice_target_invalid"
            };
        }

        let token;

        try {
            token =
                this.clientTokenFactory({
                    subject:
                        "risencare-emergency"
                });
        } catch (error) {
            return {
                status:
                    "error",

                errorCode:
                    "voice_token_generation_failed"
            };
        }

        const intentId =
            this.intentStore.create({
                facilityId,

                caseId:
                    normalizedCaseId,

                contactId:
                    normalizedContactId,

                phoneNumber:
                    contact.phoneNumber,

                fromNumber:
                    facilityPhoneNumber.phoneNumber
            });

        return {
            status:
                "issued",

            token,

            intentId,

            expiresIn:
                15 * 60
        };
    }
}

module.exports =
    VoiceClientTokenService;
