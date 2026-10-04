"use strict";

class VoiceInboundTokenService {
    constructor({
        connectorTrustService,
        clientTokenFactory
    } = {}) {
        if (
            !connectorTrustService ||
            typeof connectorTrustService.authenticate !==
                "function"
        ) {
            throw new Error(
                "VoiceInboundTokenService requires connectorTrustService"
            );
        }

        if (
            typeof clientTokenFactory !==
            "function"
        ) {
            throw new Error(
                "VoiceInboundTokenService requires clientTokenFactory"
            );
        }

        this.connectorTrustService =
            connectorTrustService;

        this.clientTokenFactory =
            clientTokenFactory;
    }

    async issue({
        connectorId,
        credential
    } = {}) {
        const normalizedConnectorId =
            String(
                connectorId || ""
            ).trim();

        const normalizedCredential =
            String(
                credential || ""
            ).trim();

        if (
            !normalizedConnectorId ||
            !normalizedCredential
        ) {
            return {
                status:
                    "invalid",
                errorCode:
                    "voice_inbound_token_request_invalid"
            };
        }

        let trustResult;

        try {
            trustResult =
                await this
                    .connectorTrustService
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
                    typeof trustResult.errorCode ===
                        "string" &&
                    trustResult.errorCode.trim()
                        ? trustResult.errorCode.trim()
                        : "connector_trust_unavailable"
            };
        }

        if (
            trustResult.status !==
                "verified" ||
            !trustResult.verifiedContext ||
            !trustResult
                .verifiedContext
                .facilityId
        ) {
            return {
                status:
                    "error",
                errorCode:
                    "connector_trust_invalid_result"
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

        if (
            typeof token !==
                "string" ||
            !token.trim()
        ) {
            return {
                status:
                    "error",
                errorCode:
                    "voice_token_generation_failed"
            };
        }

        return {
            status:
                "issued",
            token:
                token.trim(),
            expiresIn:
                15 * 60
        };
    }
}

module.exports =
    VoiceInboundTokenService;
